// routes/mpesa.routes.ts
import { Hono } from 'hono';
import { MpesaController } from './payments.controller.js';
const mpesa = new Hono();
const mpesaController = new MpesaController();
/**
 * @route   POST /mpesa/initiate/:bookingId
 * @desc    Initiate M-Pesa STK Push payment for a booking
 * @access  Public
 * @body    { phoneNumber: string, amount: number }
 */
mpesa.post('/initiate/:bookingId', mpesaController.initiatePayment);
/**
 * @route   POST /mpesa/callback
 * @desc    Handle M-Pesa callback (webhook)
 * @access  Public (M-Pesa servers only)
 * @note    This endpoint should be secured with IP whitelisting in production
 */
mpesa.post('/mpesa/callback', mpesaController.handleCallback);
/**
 * @route   GET /mpesa/status/:checkoutRequestId
 * @desc    Query M-Pesa payment status
 * @access  Public
 */
mpesa.get('/status/:checkoutRequestId', mpesaController.queryPaymentStatus);
/**
 * @route   GET /mpesa/history/:bookingId
 * @desc    Get payment history for a specific booking
 * @access  Public
 */
mpesa.get('/history/:bookingId', mpesaController.getPaymentHistory);
/**
 * @route   GET /mpesa/payments
 * @desc    Get all payments
 * @access  Public
 * @query   ?page=1&limit=10
 */
mpesa.get('/payments', mpesaController.getAllPayments);
/**
 * @route   POST /mpesa/retry/:bookingId
 * @desc    Retry failed payment for a booking
 * @access  Public
 * @body    { phoneNumber: string, amount: number }
 */
mpesa.post('/retry/:bookingId', mpesaController.retryPayment);
export default mpesa;
