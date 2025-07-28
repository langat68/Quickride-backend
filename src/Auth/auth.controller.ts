import type { Context } from 'hono';
import { AuthService } from './auth.service.js';
import { sendWelcomeEmail } from './utils/mailer.js';

export class AuthController {
  constructor(private service: AuthService) {}

  // Signup handler
  signup = async (c: Context) => {
    try {
      const body = await c.req.json();

      // Validate required fields (optional if zod schema already handles this)
      if (!body.email || !body.password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }

      // 1. Create the user
      const result = await this.service.signup(body);

      // 2. Send welcome email
      try {
        const info = await sendWelcomeEmail(result.user.email, result.user.name ?? 'user');
        if (info.accepted.includes(result.user.email)) {
          console.log('✅ Welcome email sent to', result.user.email);
        } else {
          console.warn('⚠️ Email not accepted:', info.rejected);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email:', emailError);
      }

      // 3. Respond to client
      return c.json({ message: 'User registered successfully', ...result }, 201);

    } catch (error) {
      console.error('❌ Signup error:', error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400);
      }
      return c.json({ error: 'An unknown error occurred during signup' }, 400);
    }
  };

  // Login handler
  login = async (c: Context) => {
    try {
      const body = await c.req.json();

      // Optional validation
      if (!body.email || !body.password) {
        return c.json({ error: 'Email and password are required' }, 400);
      }

      const { user, token } = await this.service.login(body);

      return c.json({ message: 'Login successful', token, user });

    } catch (error) {
      console.error('❌ Login error:', error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'An unknown error occurred during login' }, 401);
    }
  };

  // ✅ NEW: Google OAuth login handler
  googleLogin = async (c: Context) => {
    try {
      const body = await c.req.json();

      // Validate Google token
      if (!body.googleToken) {
        return c.json({ error: 'Google token is required' }, 400);
      }

      const { user, token } = await this.service.googleLogin(body);

      // Send welcome email for new Google users (optional)
      // Note: You might want to track if this is a new user to avoid duplicate emails
      try {
        const info = await sendWelcomeEmail(user.email, user.name ?? 'user');
        if (info.accepted.includes(user.email)) {
          console.log('✅ Welcome email sent to Google user:', user.email);
        }
      } catch (emailError) {
        console.error('❌ Failed to send email to Google user:', emailError);
        // Don't fail the login if email fails
      }

      return c.json({ 
        message: 'Google login successful', 
        token, 
        user 
      });

    } catch (error) {
      console.error('❌ Google login error:', error);
      if (error instanceof Error) {
        return c.json({ error: error.message }, 401);
      }
      return c.json({ error: 'An unknown error occurred during Google login' }, 401);
    }
  };
}