import type { Context } from "hono";
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  initiateMpesaPayment,
} from "./payments.service.js";
import { createPaymentSchema, paymentIdParam } from "../Validator.js";

// ✅ Get all payments
export const getAll = async (c: Context) => {
  const data = await getAllPayments();
  return c.json({ success: true, data });
};

// ✅ Get a single payment
export const getOne = async (c: Context) => {
  const { id } = paymentIdParam.parse(c.req.param());
  const data = await getPaymentById(id);
  return c.json({ success: true, data });
};

// ✅ Create a payment (used for card/bank/manual only)
export const create = async (c: Context) => {
  const body = await c.req.json();
  const parsed = createPaymentSchema.parse(body);

  const payment = await createPayment(parsed);
  return c.json({ success: true, data: payment });
};

// ✅ Initiate M-Pesa STK Push
export const initiateMpesa = async (c: Context) => {
  try {
    const body = await c.req.json();
    const parsed = createPaymentSchema.parse(body);

    const response = await initiateMpesaPayment({
      phone: parsed.phoneNumber,
      amount: parsed.amount,
      bookingId: parsed.bookingId,
      accountReference: `QuickRide-${parsed.bookingId}`,
      transactionDesc: "QuickRide Car Booking Payment",
      callbackUrl: `${process.env.BASE_URL}/payments/mpesa/callback`,
    });

    console.log(`📲 STK Push initiated for Booking ID ${parsed.bookingId}. Awaiting user confirmation...`);

    return c.json({
      success: true,
      message: "STK push initiated. Awaiting user input.",
      data: response,
    });

  } catch (error: any) {
    console.error("🚨 STK Push initiation failed:", error);
    return c.json({ success: false, message: error.message }, 400);
  }
};







