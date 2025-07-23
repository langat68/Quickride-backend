// payments.service.ts
import { db } from "../db/db.js";
import { payments, bookings } from "../db/schema.js";
import { eq, desc } from "drizzle-orm";
import type { NewPayment } from "../db/schema.js";
import {
  formatPhoneNumber,
  getAccessToken,
} from "./daraja.js";

const toDbDecimal = (num: number, scale = 2): string => num.toFixed(scale);

export const getAllPayments = async () => {
  return db.select().from(payments).orderBy(desc(payments.createdAt));
};

export const getPaymentById = async (id: number) => {
  return db.query.payments.findFirst({ where: eq(payments.id, id) });
};

export const getPaymentByBookingId = async (bookingId: number) => {
  return db.query.payments.findFirst({
    where: eq(payments.bookingId, bookingId),
    orderBy: desc(payments.createdAt),
  });
};

export const getPaymentsByUserId = async (userId: number) => {
  return db
    .select({
      id: payments.id,
      bookingId: payments.bookingId,
      amount: payments.amount,
      paymentMethod: payments.paymentMethod,
      phoneNumber: payments.phoneNumber,
      paymentStatus: payments.paymentStatus,
      transactionId: payments.transactionId,
      paymentDate: payments.paymentDate,
      createdAt: payments.createdAt,
      updatedAt: payments.updatedAt,
      bookingReference: bookings.bookingReference,
      totalAmount: bookings.totalAmount,
      pickupDate: bookings.pickupDate,
      returnDate: bookings.returnDate,
    })
    .from(payments)
    .innerJoin(bookings, eq(payments.bookingId, bookings.id))
    .where(eq(bookings.userId, userId))
    .orderBy(desc(payments.createdAt));
};

export const createPayment = async (
  data: Omit<NewPayment, "amount"> & { amount: number }
) => {
  const [inserted] = await db
    .insert(payments)
    .values({
      ...data,
      amount: toDbDecimal(data.amount),
    })
    .returning();
  return inserted;
};

export const initiateMpesaPayment = async ({
  phone,
  amount,
  bookingId,
  accountReference,
  transactionDesc,
  callbackUrl,
}: {
  phone: string;
  amount: number;
  bookingId: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}) => {
  const accessToken = await getAccessToken();
  const formattedPhone = formatPhoneNumber(phone);

  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const baseUrl = process.env.NODE_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

  const timestamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const payload = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.floor(Number(amount)),
    PartyA: formattedPhone,
    PartyB: shortcode,
    PhoneNumber: formattedPhone,
    CallBackURL: callbackUrl,
    AccountReference: String(bookingId),
    TransactionDesc: transactionDesc,
  };

  try {
    console.log("🚀 Initiating STK Push for booking:", bookingId);

    const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || result.errorCode) {
      console.error("STK Push Error Response:", result);
      throw new Error(result.errorMessage || result.errorDescription || "STK Push failed");
    }

    console.log("✅ STK Push Request Sent Successfully:", {
      CheckoutRequestID: result.CheckoutRequestID,
      MerchantRequestID: result.MerchantRequestID,
      bookingId,
    });

    return {
      success: true,
      message: "STK push initiated. Awaiting user confirmation.",
      requestId: result.CheckoutRequestID,
    };
  } catch (error: any) {
    console.error("❌ STK Push Failed:", error.message || error);
    throw new Error(`Failed to initiate M-Pesa STK Push: ${error.message}`);
  }
};

export const updatePaymentStatus = async (
  bookingId: number,
  status: "pending" | "completed" | "failed" | "refunded",
  transactionId?: string
) => {
  const updateData: any = {
    paymentStatus: status,
    updatedAt: new Date(),
  };

  if (transactionId) {
    updateData.transactionId = transactionId;
  }

  if (status === "completed") {
    updateData.paymentDate = new Date();
  }

  return db
    .update(payments)
    .set(updateData)
    .where(eq(payments.bookingId, bookingId))
    .returning();
};

export const processMpesaCallback = async (callbackData: any) => {
  const stkCallback = callbackData?.Body?.stkCallback;
  if (!stkCallback) throw new Error("Invalid callback format");

  const resultCode = stkCallback.ResultCode;
  const resultDesc = stkCallback.ResultDesc;
  const metadata = stkCallback.CallbackMetadata;

  let bookingId = 0;
  let mpesaReceipt = "";
  let amount = 0;
  let phoneNumber = "";

  if (metadata?.Item) {
    const refItem = metadata.Item.find((item: any) => item.Name === "AccountReference");
    const receiptItem = metadata.Item.find((item: any) => item.Name === "MpesaReceiptNumber");
    const amountItem = metadata.Item.find((item: any) => item.Name === "Amount");
    const phoneItem = metadata.Item.find((item: any) => item.Name === "PhoneNumber");

    bookingId = Number(refItem?.Value || 0);
    mpesaReceipt = receiptItem?.Value || "";
    amount = Number(amountItem?.Value || 0);
    phoneNumber = phoneItem?.Value || "";
  }

  if (!bookingId) {
    console.error("❌ Missing booking ID in callback metadata");
    throw new Error("Missing booking ID");
  }

  if (resultCode === 0) {
    await createPayment({
      bookingId,
      amount,
      phoneNumber,
      paymentMethod: "mpesa",
      paymentStatus: "completed",
      transactionId: mpesaReceipt,
      paymentDate: new Date(),
    });
    return { success: true, status: "completed", bookingId, receipt: mpesaReceipt };
  } else {
    return { success: false, status: "failed", bookingId, message: resultDesc };
  }
};

export const getPaymentStats = async () => {
  const stats = await db.select().from(payments);
  const totalPayments = stats.length;
  const completedPayments = stats.filter(p => p.paymentStatus === "completed").length;
  const failedPayments = stats.filter(p => p.paymentStatus === "failed").length;
  const pendingPayments = stats.filter(p => p.paymentStatus === "pending").length;
  const totalAmount = stats
    .filter(p => p.paymentStatus === "completed")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  return {
    totalPayments,
    completedPayments,
    failedPayments,
    pendingPayments,
    totalAmount: totalAmount.toFixed(2),
    successRate: totalPayments > 0 ? ((completedPayments / totalPayments) * 100).toFixed(1) : "0",
  };
};

export const isPaymentCompleted = async (bookingId: number): Promise<boolean> => {
  const payment = await getPaymentByBookingId(bookingId);
  return payment?.paymentStatus === "completed";
};

export const getRecentPayments = async (limit: number = 10) => {
  return db.select().from(payments).orderBy(desc(payments.createdAt)).limit(limit);
};
