// Load environment variables first
import dotenv from 'dotenv';
dotenv.config(); // 👈 ensure .env is loaded early

import { serve } from '@hono/node-server';
import { Hono } from 'hono';

import userRouter from './Users/user.route.js';
import authRouter from './Auth/auth.route.js';
import { carRouter } from './Cars/cars.route.js';
import bookingRouter from './Bookings/bookings.routes.js';
import mpesa from './Payments/payments.route.js';

const app = new Hono();

// Root route
app.get('/', (c) => c.text('Hello Hono! 🚀'));

// Mount routes
app.route('/users', userRouter);
app.route('/auth', authRouter);
app.route ('/cars', carRouter);
app.route('/bookings', bookingRouter);
app.route('/payments', mpesa)


// Use PORT from .env or fallback to 3000
const PORT = Number(process.env.PORT) || 3000;

serve(
  {
    fetch: app.fetch,
    port: PORT,
  },
  (info) => {
    console.log(`✅ Server running at: http://localhost:${info.port}`);
  }
);
