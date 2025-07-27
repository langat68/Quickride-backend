// Load environment variables first
import dotenv from 'dotenv';
dotenv.config(); // 👈 ensure .env is loaded early

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger'; // 👈 Hono's built-in logger

// Routers
import userRouter from './Users/user.route.js';
import authRouter from './Auth/auth.route.js';
import { carRouter } from './Cars/cars.route.js';
import bookingRouter from './Bookings/bookings.routes.js';
import mpesa from './Payments/payments.route.js';

const app = new Hono();

// ✅ Log all requests with method, path, and response status
app.use('*', logger());

// ✅ Determine allowed origins based on environment
const allowedOrigins = [
  'http://localhost:5173',  // Development frontend
  'http://localhost:3000',  // Alternative dev port
  'https://quickride-frontend-ojoo.vercel.app'  // Production frontend
];

// ✅ Enable CORS for both development and production
app.use(
  '*',
  cors({
    origin: (origin) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return origin;
      
      // Return the origin if it's allowed, otherwise return null
      return allowedOrigins.includes(origin) ? origin : null;
    },
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    credentials: true, // 👈 allow cookies/sessions or credentials
  })
);

// ✅ Root route for testing
app.get('/', (c) => c.text('Hello Hono! 🚀'));

// ✅ Mount route groups
app.route('/users', userRouter);
app.route('/auth', authRouter);
app.route('/cars', carRouter);
app.route('/bookings', bookingRouter);
app.route('/payments', mpesa);

// ✅ Use PORT from .env or default to 3000
const PORT = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`✅ Server running at: http://localhost:${info.port}`);
    console.log(`🌐 Allowed CORS origins:`, allowedOrigins);
  }
);