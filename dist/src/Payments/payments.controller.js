import { MpesaService } from './payments.service.js';
import { initiateMpesaSchema } from '../Validator.js'; // Adjust path
import { db } from '../db/db.js'; // Adjust path
import { bookings, payments, mpesaRequests } from '../db/schema.js'; // Adjust path
import { eq, and } from 'drizzle-orm';
export class MpesaController {
    mpesaService;
    constructor() {
        this.mpesaService = new MpesaService();
    }
    /**
     * Initiate M-Pesa STK Push payment
     */
    initiatePayment = async (c) => {
        try {
            const bookingId = c.req.param('bookingId');
            const body = await c.req.json();
            const validatedData = initiateMpesaSchema.parse(body);
            const { phoneNumber, amount } = validatedData;
            // Validate booking exists and belongs to user (if applicable)
            const booking = await db
                .select()
                .from(bookings)
                .where(eq(bookings.id, parseInt(bookingId)))
                .limit(1);
            if (!booking.length) {
                return c.json({
                    success: false,
                    message: 'Booking not found',
                }, 404);
            }
            // Check if booking is already paid
            const existingPayment = await db
                .select()
                .from(payments)
                .where(and(eq(payments.bookingId, parseInt(bookingId)), eq(payments.paymentStatus, 'completed')))
                .limit(1);
            if (existingPayment.length > 0) {
                return c.json({
                    success: false,
                    message: 'This booking has already been paid for',
                }, 400);
            }
            // Initiate STK push
            const result = await this.mpesaService.initiateSTKPush(parseInt(bookingId), phoneNumber, amount);
            if (result.success) {
                return c.json({
                    success: true,
                    message: result.message,
                    data: {
                        merchantRequestId: result.data?.MerchantRequestID,
                        checkoutRequestId: result.data?.CheckoutRequestID,
                    },
                }, 200);
            }
            else {
                return c.json({
                    success: false,
                    message: result.message,
                }, 400);
            }
        }
        catch (error) {
            console.error('Initiate payment error:', error);
            return c.json({
                success: false,
                message: 'Internal server error',
            }, 500);
        }
    };
    /**
     * Handle M-Pesa callback
     */
    handleCallback = async (c) => {
        try {
            const body = await c.req.json();
            console.log('M-Pesa Callback received:', JSON.stringify(body, null, 2));
            await this.mpesaService.handleCallback(body);
            // Always respond with success to M-Pesa
            return c.json({
                ResultCode: 0,
                ResultDesc: 'Success',
            }, 200);
        }
        catch (error) {
            console.error('Callback error:', error);
            // Still respond with success to prevent M-Pesa retries
            return c.json({
                ResultCode: 0,
                ResultDesc: 'Success',
            }, 200);
        }
    };
    /**
     * Query payment status
     */
    queryPaymentStatus = async (c) => {
        try {
            const checkoutRequestId = c.req.param('checkoutRequestId');
            if (!checkoutRequestId) {
                return c.json({
                    success: false,
                    message: 'Checkout request ID is required',
                }, 400);
            }
            const result = await this.mpesaService.querySTKPushStatus(checkoutRequestId);
            return c.json(result, 200);
        }
        catch (error) {
            console.error('Query payment status error:', error);
            return c.json({
                success: false,
                message: 'Internal server error',
            }, 500);
        }
    };
    /**
     * Get payment history for a booking
     */
    getPaymentHistory = async (c) => {
        try {
            const bookingId = c.req.param('bookingId');
            const paymentHistory = await db
                .select({
                id: payments.id,
                amount: payments.amount,
                paymentMethod: payments.paymentMethod,
                phoneNumber: payments.phoneNumber,
                paymentStatus: payments.paymentStatus,
                transactionId: payments.transactionId,
                paymentDate: payments.paymentDate,
                createdAt: payments.createdAt,
            })
                .from(payments)
                .where(eq(payments.bookingId, parseInt(bookingId)));
            const mpesaHistory = await db
                .select({
                id: mpesaRequests.id,
                merchantRequestId: mpesaRequests.merchantRequestId,
                checkoutRequestId: mpesaRequests.checkoutRequestId,
                status: mpesaRequests.status,
                createdAt: mpesaRequests.createdAt,
            })
                .from(mpesaRequests)
                .where(eq(mpesaRequests.bookingId, parseInt(bookingId)));
            return c.json({
                success: true,
                data: {
                    payments: paymentHistory,
                    mpesaRequests: mpesaHistory,
                },
            }, 200);
        }
        catch (error) {
            console.error('Get payment history error:', error);
            return c.json({
                success: false,
                message: 'Internal server error',
            }, 500);
        }
    };
    /**
     * Get all payments (admin only)
     */
    getAllPayments = async (c) => {
        try {
            const page = parseInt(c.req.query('page') || '1');
            const limit = parseInt(c.req.query('limit') || '10');
            const offset = (page - 1) * limit;
            const allPayments = await db
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
                bookingReference: bookings.bookingReference,
            })
                .from(payments)
                .leftJoin(bookings, eq(payments.bookingId, bookings.id))
                .limit(limit)
                .offset(offset)
                .orderBy(payments.createdAt);
            return c.json({
                success: true,
                data: allPayments,
                pagination: {
                    page,
                    limit,
                    hasMore: allPayments.length === limit,
                },
            }, 200);
        }
        catch (error) {
            console.error('Get all payments error:', error);
            return c.json({
                success: false,
                message: 'Internal server error',
            }, 500);
        }
    };
    /**
     * Retry failed payment
     */
    retryPayment = async (c) => {
        try {
            const bookingId = c.req.param('bookingId');
            const body = await c.req.json();
            const validatedData = initiateMpesaSchema.parse(body);
            const { phoneNumber, amount } = validatedData;
            // Mark previous failed attempts as cancelled
            await db
                .update(payments)
                .set({ paymentStatus: 'failed' })
                .where(and(eq(payments.bookingId, parseInt(bookingId)), eq(payments.paymentStatus, 'pending')));
            await db
                .update(mpesaRequests)
                .set({ status: 'failed' })
                .where(and(eq(mpesaRequests.bookingId, parseInt(bookingId)), eq(mpesaRequests.status, 'pending')));
            // Initiate new payment
            const result = await this.mpesaService.initiateSTKPush(parseInt(bookingId), phoneNumber, amount);
            if (result.success) {
                return c.json({
                    success: true,
                    message: result.message,
                    data: {
                        merchantRequestId: result.data?.MerchantRequestID,
                        checkoutRequestId: result.data?.CheckoutRequestID,
                    },
                }, 200);
            }
            else {
                return c.json({
                    success: false,
                    message: result.message,
                }, 400);
            }
        }
        catch (error) {
            console.error('Retry payment error:', error);
            return c.json({
                success: false,
                message: 'Internal server error',
            }, 500);
        }
    };
}
