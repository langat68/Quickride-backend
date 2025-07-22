// payments.controller.ts
import type { Context } from "hono";
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
    bookingId,
    accountReference,
    transactionDesc,
    callbackUrl,
  } = body;

  const response = await paymentService.initiateMpesaPayment({
    phone,
    amount,
    bookingId,
    accountReference,
    transactionDesc,
    callbackUrl,
  });

  return c.json({ success: true, data: response });
};

export const mpesaCallback = async (c: Context) => {
  const body = await c.req.json();
  const stkCallback = body.Body.stkCallback;
  const resultCode = stkCallback.ResultCode;
  const metadata = stkCallback.CallbackMetadata?.Item || [];
  const accountReferenceItem = metadata.find((i: any) => i.Name === "AccountReference");
  const transactionIdItem = metadata.find((i: any) => i.Name === "MpesaReceiptNumber");

  const bookingId = parseInt(accountReferenceItem?.Value);
  const transactionId = transactionIdItem?.Value;

  if (resultCode === 0) {
    await paymentService.updatePaymentStatus(bookingId, "completed", transactionId);
  } else {
    await paymentService.updatePaymentStatus(bookingId, "failed");
  }

  return c.json({ success: true });
};