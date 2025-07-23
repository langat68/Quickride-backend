// services/mpesa.service.ts
import axios from 'axios';
import { db } from '../db/db.js'; // Adjust path to your database
import { payments, mpesaRequests, bookings } from '../db/schema.js'; // Adjust path
import { eq } from 'drizzle-orm';

interface MpesaAccessTokenResponse {
  access_token: string;
  expires_in: string;
}

interface STKPushRequest {
  BusinessShortCode: string;
  Password: string;
  Timestamp: string;
  TransactionType: string;
  Amount: number;
  PartyA: string;
  PartyB: string;
  PhoneNumber: string;
  CallBackURL: string;
  AccountReference: string;
  TransactionDesc: string;
}

interface STKPushResponse {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
}

interface CallbackRequest {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: Array<{
          Name: string;
          Value: string | number;
        }>;
      };
    };
  };
}

export class MpesaService {
  private readonly consumerKey: string;
  private readonly consumerSecret: string;
  private readonly businessShortCode: string;
  private readonly passkey: string;
  private readonly callbackUrl: string;
  private readonly baseUrl: string;

  constructor() {
    this.consumerKey = process.env.MPESA_CONSUMER_KEY!;
    this.consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
    this.businessShortCode = process.env.MPESA_BUSINESS_SHORT_CODE!;
    this.passkey = process.env.MPESA_PASSKEY!;
    this.callbackUrl = process.env.MPESA_CALLBACK_URL!;
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.safaricom.co.ke' 
      : 'https://sandbox.safaricom.co.ke';

    // Validate required environment variables
    if (!this.consumerKey || !this.consumerSecret || !this.businessShortCode || !this.passkey || !this.callbackUrl) {
      throw new Error('Missing required M-Pesa environment variables');
    }
  }

  /**
   * Get OAuth access token from M-Pesa API
   */
  private async getAccessToken(): Promise<string> {
    try {
      const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      
      const response = await axios.get<MpesaAccessTokenResponse>(
        `${this.baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );

      return response.data.access_token;
    } catch (error) {
      console.error('Error getting M-Pesa access token:', error);
      throw new Error('Failed to get M-Pesa access token');
    }
  }

  /**
   * Generate password for STK push
   */
  private generatePassword(): { password: string; timestamp: string } {
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    const password = Buffer.from(`${this.businessShortCode}${this.passkey}${timestamp}`).toString('base64');
    
    return { password, timestamp };
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove any non-digit characters
    const cleaned = phoneNumber.replace(/\D/g, '');
    
    // Handle Kenyan numbers
    if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.startsWith('0')) {
      return '254' + cleaned.slice(1);
    } else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
      return '254' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Initiate STK Push payment
   */
  async initiateSTKPush(bookingId: number, phoneNumber: string, amount: number): Promise<{
    success: boolean;
    message: string;
    data?: STKPushResponse;
  }> {
    try {
      // Get booking details
      const booking = await db.select().from(bookings).where(eq(bookings.id, bookingId)).limit(1);
      
      if (!booking.length) {
        return {
          success: false,
          message: 'Booking not found'
        };
      }

      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();
      const formattedPhone = this.formatPhoneNumber(phoneNumber);

      const stkPushData: STKPushRequest = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: Math.round(amount), // M-Pesa requires integer amounts
        PartyA: formattedPhone,
        PartyB: this.businessShortCode,
        PhoneNumber: formattedPhone,
        CallBackURL: this.callbackUrl,
        AccountReference: booking[0].bookingReference,
        TransactionDesc: `Payment for booking ${booking[0].bookingReference}`,
      };

      const response = await axios.post<STKPushResponse>(
        `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
        stkPushData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.ResponseCode === '0') {
        // Store M-Pesa request in database
        await db.insert(mpesaRequests).values({
          bookingId,
          merchantRequestId: response.data.MerchantRequestID,
          checkoutRequestId: response.data.CheckoutRequestID,
          status: 'pending',
        });

        // Create payment record
        await db.insert(payments).values({
          bookingId,
          amount: amount.toString(),
          paymentMethod: 'mpesa',
          phoneNumber: formattedPhone,
          paymentStatus: 'pending',
        });

        return {
          success: true,
          message: response.data.CustomerMessage,
          data: response.data,
        };
      } else {
        return {
          success: false,
          message: response.data.ResponseDescription || 'STK push failed',
        };
      }
    } catch (error) {
      console.error('STK Push error:', error);
      return {
        success: false,
        message: 'Failed to initiate payment. Please try again.',
      };
    }
  }

  /**
   * Handle M-Pesa callback
   */
  async handleCallback(callbackData: CallbackRequest): Promise<void> {
    try {
      const { stkCallback } = callbackData.Body;
      const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

      // Find the M-Pesa request
      const mpesaRequest = await db
        .select()
        .from(mpesaRequests)
        .where(eq(mpesaRequests.merchantRequestId, MerchantRequestID))
        .limit(1);

      if (!mpesaRequest.length) {
        console.error('M-Pesa request not found:', MerchantRequestID);
        return;
      }

      const request = mpesaRequest[0];

      if (ResultCode === 0) {
        // Payment successful
        let transactionId = '';
        let paidAmount = 0;

        if (stkCallback.CallbackMetadata?.Item) {
          for (const item of stkCallback.CallbackMetadata.Item) {
            if (item.Name === 'MpesaReceiptNumber') {
              transactionId = item.Value as string;
            }
            if (item.Name === 'Amount') {
              paidAmount = item.Value as number;
            }
          }
        }

        // Update M-Pesa request status
        await db
          .update(mpesaRequests)
          .set({ status: 'completed' })
          .where(eq(mpesaRequests.id, request.id));

        // Update payment record
        await db
          .update(payments)
          .set({
            paymentStatus: 'completed',
            transactionId,
            paymentDate: new Date(),
          })
          .where(eq(payments.bookingId, request.bookingId));

        // Update booking status to confirmed
        await db
          .update(bookings)
          .set({ status: 'confirmed' })
          .where(eq(bookings.id, request.bookingId));

        console.log(`Payment successful for booking ${request.bookingId}:`, transactionId);
      } else {
        // Payment failed
        await db
          .update(mpesaRequests)
          .set({ status: 'failed' })
          .where(eq(mpesaRequests.id, request.id));

        await db
          .update(payments)
          .set({ paymentStatus: 'failed' })
          .where(eq(payments.bookingId, request.bookingId));

        console.log(`Payment failed for booking ${request.bookingId}:`, ResultDesc);
      }
    } catch (error) {
      console.error('Error handling M-Pesa callback:', error);
    }
  }

  /**
   * Query STK Push status
   */
  async querySTKPushStatus(checkoutRequestId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      const accessToken = await this.getAccessToken();
      const { password, timestamp } = this.generatePassword();

      const queryData = {
        BusinessShortCode: this.businessShortCode,
        Password: password,
        Timestamp: timestamp,
        CheckoutRequestID: checkoutRequestId,
      };

      const response = await axios.post(
        `${this.baseUrl}/mpesa/stkpushquery/v1/query`,
        queryData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return {
        success: true,
        message: 'Query successful',
        data: response.data,
      };
    } catch (error) {
      console.error('STK Push query error:', error);
      return {
        success: false,
        message: 'Failed to query payment status',
      };
    }
  }
}