import { db } from '../db/db.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, comparePassword } from './utils/hash.js';
import { createToken } from '../Auth/utils/jwt.js';

type SignupInput = {
  email: string;
  password: string;
  name?: string;
  role?: 'admin' | 'staff' | 'customer';
};

type LoginInput = {
  email: string;
  password: string;
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
        passwordHash: hashed, // ✅ fixed field name
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

  // Login logic
  async login({ email, password }: LoginInput) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) throw new Error('User not found');

    // Compare hashed password
    const valid = await comparePassword(password, user.passwordHash); // ✅ also fixed here
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
}
