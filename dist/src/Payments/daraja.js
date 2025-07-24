// src/payments/daraja.ts
import axios from 'axios';
const config = {
    consumerKey: process.env.MPESA_CONSUMER_KEY,
    consumerSecret: process.env.MPESA_CONSUMER_SECRET,
    shortCode: process.env.MPESA_SHORTCODE,
    passkey: process.env.MPESA_PASSKEY,
    callbackUrl: process.env.MPESA_CALLBACK_URL,
    baseUrl: 'https://sandbox.safaricom.co.ke', // Change to production when going live
};
// 🔹 Helper: Clean and format phone numbers to 2547...
export function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/[\s\-+]/g, '');
    if (cleaned.startsWith('0')) {
        cleaned = '254' + cleaned.substring(1);
    }
    else if (cleaned.startsWith('7') || cleaned.startsWith('1')) {
        cleaned = '254' + cleaned;
    }
    else if (!cleaned.startsWith('254')) {
        cleaned = '254' + cleaned;
    }
    return cleaned;
}
// 🔹 Get M-Pesa Access Token
export async function getAccessToken() {
    try {
        const auth = Buffer.from(`${config.consumerKey}:${config.consumerSecret}`).toString('base64');
        const response = await axios.get(`${config.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` },
        });
        return response.data.access_token;
    }
    catch (error) {
        console.error('❌ Failed to get M-Pesa access token:', error);
        throw new Error('Failed to authenticate with M-Pesa API');
    }
}
// 🔹 STK Push Initiator
export async function stkPush(phone, amount, accountRef = 'CHUKUARIDE', transactionDesc = 'Payment for car rental', bookingId) {
    try {
        const token = await getAccessToken();
        const formattedPhone = formatPhoneNumber(phone);
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(config.shortCode + config.passkey + timestamp).toString('base64');
        const payload = {
            BusinessShortCode: config.shortCode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: Math.floor(Number(amount)),
            PartyA: formattedPhone,
            PartyB: config.shortCode,
            PhoneNumber: formattedPhone,
            CallBackURL: config.callbackUrl,
            AccountReference: bookingId ? String(bookingId) : accountRef,
            TransactionDesc: transactionDesc,
        };
        const res = await axios.post(`${config.baseUrl}/mpesa/stkpush/v1/processrequest`, payload, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });
        const { MerchantRequestID, CheckoutRequestID, ResponseCode, ResponseDescription, CustomerMessage, } = res.data;
        console.log('✅ STK Push Request Sent:', res.data);
        return {
            success: ResponseCode === '0',
            MerchantRequestID,
            CheckoutRequestID,
            ResponseDescription,
            CustomerMessage,
        };
    }
    catch (error) {
        console.error('❌ STK Push failed:', error.response?.data || error.message);
        throw new Error('Failed to initiate M-Pesa payment');
    }
}
