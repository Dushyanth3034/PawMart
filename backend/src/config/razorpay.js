import Razorpay from 'razorpay';
import dotenv from 'dotenv';
dotenv.config();

const key_id = process.env.RAZORPAY_KEY_ID;
const key_secret = process.env.RAZORPAY_KEY_SECRET;

if (!key_id || !key_secret) {
  console.warn('[Razorpay Init Warning] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing in environment variables. Gateway operations will fail until configured.');
} else {
  console.log(`[Razorpay Init] Successfully initialized Razorpay Client in Test Mode (Key ID: ${key_id.slice(0, 8)}...).`);
}

export const razorpayInstance = new Razorpay({
  key_id: key_id || 'dummy_key_id',
  key_secret: key_secret || 'dummy_key_secret'
});

export function getRazorpayClient() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay Test Mode credentials are not configured in environment variables.');
  }
  return razorpayInstance;
}
