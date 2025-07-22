import type  { Context } from "hono";
import * as paymentService from "./payments.service.js";
import { createPaymentSchema, paymentIdParam } from "../Validator.js";

export const getAll = async (c: Context) => {
  const data = await paymentService.getAllPayments();
  return c.json({ success: true, data });
};

export const getOne = async (c: Context) => {
  const { id } = paymentIdParam.parse(c.req.param());
  const data = await paymentService.getPaymentById(id);
  if (!data) return c.json({ success: false, message: "Payment not found" }, 404);
  return c.json({ success: true, data });
};

export const create = async (c: Context) => {
  const body = await c.req.json();
  const data = createPaymentSchema.parse(body);

  const payment = await paymentService.createPayment(data);

  return c.json({ success: true, data: payment });
};

export const initiateMpesa = async (c: Context) => {
  const body = await c.req.json();

  const {
    phone,
    amount,
    accountReference,
    transactionDesc,
    callbackUrl,
  } = body;

  const response = await paymentService.initiateMpesaPayment({
    phone,
    amount,
    accountReference,
    transactionDesc,
    callbackUrl,
  });

  return c.json({ success: true, data: response });
};

// Callback from M-Pesa
export const mpesaCallback = async (c: Context) => {
  const body = await c.req.json();

  const resultCode =
    body.Body.stkCallback.ResultCode;
  const bookingId =
    parseInt(body.Body.stkCallback.CallbackMetadata?.Item?.find((i: any) => i.Name === "AccountReference")?.Value);

  if (resultCode === 0) {
    const transactionId =
      body.Body.stkCallback.MpesaReceiptNumber;

    await paymentService.updatePaymentStatus(bookingId, "completed", transactionId);
  } else {
    await paymentService.updatePaymentStatus(bookingId, "failed");
  }

  return c.json({ success: true });
};
