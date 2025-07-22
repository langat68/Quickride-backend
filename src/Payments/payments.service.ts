import { db } from "../db/db.js";
import { payments } from "../db/schema.js";
import { eq } from "drizzle-orm";
import type { NewPayment } from "../db/schema.js";
import axios from "axios";

// Utility to convert number → DB decimal string
const toDbDecimal = (num: number, scale = 2): string => num.toFixed(scale);

export const getAllPayments = async () => {
  return db.select().from(payments);
};

export const getPaymentById = async (id: number) => {
  return db.query.payments.findFirst({
    where: eq(payments.id, id),
  });
};

// updated to accept `amount: number` and convert properly
export const createPayment = async (
  data: Omit<NewPayment, "amount"> & { amount: number }
) => {
  const [inserted] = await db
    .insert(payments)
    .values({
      ...data,
      amount: toDbDecimal(data.amount), // 🔥 convert number → string
    })
    .returning();

  return inserted;
};

// Initiate M-Pesa STK Push
export const initiateMpesaPayment = async ({
  phone,
  amount,
  accountReference,
  transactionDesc,
  callbackUrl,
}: {
  phone: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl: string;
}) => {
  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const baseUrl = "https://sandbox.safaricom.co.ke";

  // Get access token
  const authResponse = await axios.get(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    auth: { username: consumerKey, password: consumerSecret },
  });

  const accessToken = authResponse.data.access_token;

  const timestamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 14);

  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

  const stkResponse = await axios.post(
    `${baseUrl}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: accountReference,
      TransactionDesc: transactionDesc,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return stkResponse.data;
};

// Update payment on callback
export const updatePaymentStatus = async (
  bookingId: number,
  status: string,
  transactionId?: string
) => {
  return db
    .update(payments)
    .set({ paymentStatus: status, transactionId })
    .where(eq(payments.bookingId, bookingId))
    .returning();
};
