import { db } from '../db/db.js';
import { users } from '../db/schema.js';
import { eq, or } from 'drizzle-orm';
import { hashPassword, comparePassword } from './utils/hash.js';
import { createToken } from '../Auth/utils/jwt.js';

type SignupInput = {
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'customer' | 'customer';
};

type LoginInput = {
  email: string;
  password: string;
};

type GoogleLoginInput = {
  googleToken: string;
};

type GoogleUserData = {
  sub: string; // Google ID
  email: string;
  name: string;
  picture?: string;
};

export class AuthService {
  // Signup logic
  async signup({ email, password, name, role = 'customer' }: SignupInput) {
    // Check if email is taken
    const existing = await db.select().from(users).where(eq(users.email, email));
    if (existing.length > 0) {
      throw new Error('Email already registered');
    }

    // Hash the password
    const hashed = await hashPassword(password);

    // Insert user into DB
    const [user] = await db
      .insert(users)
      .values({
        email,
        passwordHash: hashed,
        name: name ?? '',
        role
      })
      .returning({
        id: users.id,
        email: users.email,
        role: users.role,
        name: users.name
      });

    // Generate JWT token
    const token = createToken({ id: user.id, role: user.role });

    return { user, token };
  }

  // Regular email/password login
  async login({ email, password }: LoginInput) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw new Error('User not found');

    // Check if user has a password (not a Google-only user)
    if (!user.passwordHash) {
      throw new Error('This account was created with Google. Please sign in with Google.');
    }

    // Compare hashed password
    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) throw new Error('Invalid credentials');

    // Generate token
    const token = createToken({ id: user.id, role: user.role });

    // Return safe user data
    const safeUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      createdAt: user.createdAt,
    };

    return { token, user: safeUser };
  }

  // ✅ NEW: Google OAuth login
  async googleLogin({ googleToken }: GoogleLoginInput) {
    // Verify Google token and get user data
    const googleUser = await this.verifyGoogleToken(googleToken);
    
    // Check if user exists by email OR googleId
    const [existingUser] = await db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, googleUser.email),
          eq(users.googleId, googleUser.sub)
        )
      );

    let user;

    if (existingUser) {
      // User exists - update their googleId if not set
      if (!existingUser.googleId) {
        [user] = await db
          .update(users)
          .set({ googleId: googleUser.sub })
          .where(eq(users.id, existingUser.id))
          .returning({
            id: users.id,
            email: users.email,
            role: users.role,
            name: users.name,
            createdAt: users.createdAt,
          });
      } else {
        user = {
          id: existingUser.id,
          email: existingUser.email,
          role: existingUser.role,
          name: existingUser.name,
          createdAt: existingUser.createdAt,
        };
      }
    } else {
      // New user - create account
      [user] = await db
        .insert(users)
        .values({
          email: googleUser.email,
          googleId: googleUser.sub,
          name: googleUser.name,
          role: 'customer',
          // passwordHash is null for Google users
        })
        .returning({
          id: users.id,
          email: users.email,
          role: users.role,
          name: users.name,
          createdAt: users.createdAt,
        });
    }

    // Generate JWT token
    const token = createToken({ id: user.id, role: user.role });

    return { token, user };
  }

  // ✅ Helper: Verify Google token
  private async verifyGoogleToken(token: string): Promise<GoogleUserData> {
    try {
      // Verify token with Google's API
      const response = await fetch(
        `https://www.googleapis.com/oauth2/v3/tokeninfo?id_token=${token}`
      );

      if (!response.ok) {
        throw new Error('Invalid Google token');
      }

      const data = await response.json();

      // Check if token is valid and not expired
      if (!data.sub || !data.email) {
        throw new Error('Invalid Google token data');
      }

      return {
        sub: data.sub,
        email: data.email,
        name: data.name || data.given_name || 'User',
        picture: data.picture,
      };
    } catch (error) {
      throw new Error('Failed to verify Google token');
    }
  }
}