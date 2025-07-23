// src/payments/payments.route.ts
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createPaymentSchema, paymentIdParam } from '../Validator.js';
import * as PaymentService from './payments.service.js';
import { z } from 'zod';

const paymentRouter = new Hono();

// 🔹 Get all payments
paymentRouter.get('/', async (c) => {
  const data = await PaymentService.getAllPayments();
  return c.json(data);
});

// 🔹 Get a payment by ID
paymentRouter.get('/:id', zValidator('param', paymentIdParam), async (c) => {
  const id = Number(c.req.param('id'));
  const payment = await PaymentService.getPaymentById(id);
  if (!payment) return c.json({ error: 'Payment not found' }, 404);
  return c.json(payment);
});

// 🔹 Create payment + initiate M-Pesa STK push
paymentRouter.post('/pay', zValidator('json', createPaymentSchema), async (c) => {
  const body = c.req.valid('json');

  try {
    // Save payment with 'pending' status
    const saved = await PaymentService.createPayment({
      bookingId: body.bookingId,
      amount: body.amount,
      paymentMethod: 'mpesa',
      paymentStatus: 'pending',
      phoneNumber: body.phoneNumber,
    });

    // Initiate M-Pesa STK Push
    const stkResponse = await PaymentService.initiateMpesaPayment({
      phone: body.phoneNumber,
      amount: body.amount,
      bookingId: body.bookingId,
      accountReference: `QuickRide-${body.bookingId}`,
      transactionDesc: 'Payment for car rental',
      callbackUrl: process.env.MPESA_CALLBACK_URL!, // ✅ Use correct env variable
    });

    console.log(`📲 STK Push initiated for Booking ID ${body.bookingId}. Awaiting user confirmation...`);

    return c.json({ 
      success: true, 
      message: "STK push initiated. Awaiting user input.",
      data: stkResponse, 
      saved 
    });
  } catch (error: any) {
    console.error("🚨 STK Push initiation failed:", error);
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 🔹 M-Pesa STK Push Callback (fixed path: /mpesa/callback)
paymentRouter.post('/mpesa/callback', async (c) => {
  try {
    console.log("🔔 M-Pesa Callback Received");
    
    const body = await c.req.json();
    console.log("📄 Raw callback body:", JSON.stringify(body, null, 2));
    
    const callbackData = body.Body?.stkCallback;

    if (!callbackData) {
      console.log("❌ Invalid callback structure");
      return c.text("Invalid callback", 200); // Return 200 to acknowledge
    }

    const resultCode = callbackData.ResultCode;
    const metadata = callbackData.CallbackMetadata?.Item || [];
    
    // Extract booking ID from MerchantRequestID (format: QuickRide-123)
    let bookingId = 0;
    if (callbackData.MerchantRequestID) {
      const parts = callbackData.MerchantRequestID.split('-');
      if (parts.length > 1) {
        bookingId = Number(parts[1]);
      }
    }
    
    // Fallback: try to get from AccountReference in metadata
    if (!bookingId) {
      const accountRef = metadata.find((i: any) => i.Name === 'AccountReference')?.Value;
      if (accountRef && accountRef.includes('-')) {
        bookingId = Number(accountRef.split('-')[1]);
      }
    }

    if (!bookingId) {
      console.log("❌ Could not extract booking ID from callback");
      console.log("🔍 MerchantRequestID:", callbackData.MerchantRequestID);
      console.log("🔍 Available metadata:", metadata);
      return c.text("Missing bookingId", 200);
    }

    const transactionId = metadata.find(
      (i: any) => i.Name === 'MpesaReceiptNumber'
    )?.Value || '';

    const amountPaid = metadata.find(
      (i: any) => i.Name === 'Amount'
    )?.Value || 0;

    const phoneNumber = metadata.find(
      (i: any) => i.Name === 'PhoneNumber'
    )?.Value || '';

    const status = resultCode === 0 ? 'completed' : 'failed';

    console.log(`📊 Processing payment: 
===============================
🆔 Booking ID:        ${bookingId}
📊 Status:            ${status}
🧾 Transaction ID:    ${transactionId}
💰 Amount:            KES ${amountPaid}
📞 Phone:             ${phoneNumber}
🔢 Result Code:       ${resultCode}
===============================`);

    if (resultCode === 0) {
      // Successful payment - update the existing pending payment
      await PaymentService.updatePaymentStatus(bookingId, status, transactionId);
      
      console.log(`🌟 PAYMENT SUCCESSFUL for booking ${bookingId}`);
    } else {
      // Failed payment
      await PaymentService.updatePaymentStatus(bookingId, status, transactionId);
      
      console.log(`❌ PAYMENT FAILED for booking ${bookingId}: ${callbackData.ResultDesc}`);
    }

    console.log(`✅ Payment status updated successfully for booking ${bookingId}`);

    return c.text("Callback processed successfully", 200);
    
  } catch (error: any) {
    console.error("🚨 Callback handling error:", error);
    console.error("🚨 Error stack:", error.stack);
    return c.text("Callback handled", 200); // Still return 200 to avoid retries
  }
});

// 🔹 Get payments by user ID
paymentRouter.get('/by-user', async (c) => {
  const userId = Number(c.req.query('userId'));
  if (isNaN(userId)) return c.json({ error: 'Invalid userId' }, 400);

  try {
    const data = await PaymentService.getPaymentsByUserId(userId);
    return c.json(data);
  } catch (err) {
    console.error(err);
    return c.text('Internal Server Error', 500);
  }
});

// 🔹 Test endpoint to verify callback URL is reachable
paymentRouter.get('/mpesa/callback', (c) => {
  return c.text('M-Pesa callback endpoint is reachable! Use POST for actual callbacks.');
});

export default paymentRouter;