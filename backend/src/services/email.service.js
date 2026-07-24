import { BrevoClient } from '@getbrevo/brevo';
import { config } from '../config/index.js';

const brevo = new BrevoClient({
  apiKey: config.brevoApiKey
});

export class EmailService {
  /**
   * Helper to send HTML email via Brevo
   */
  static async sendHtmlEmail(to, subject, html) {
    try {
      console.log(`Sending email via Brevo to ${to}: "${subject}"`);
      const response = await brevo.transactionalEmails.sendTransacEmail({
        subject,
        htmlContent: html,
        sender: { name: config.brevoSenderName, email: config.brevoSenderEmail },
        to: [{ email: to }]
      });

      console.log('Brevo send email response:', JSON.stringify(response, null, 2));

      return { success: true, data: response };
    } catch (error) {
      console.error(`Failed to send email to ${to} via Brevo:`, error);
      const errMsg = error.response?.body?.message || error.message || 'Something went wrong. Please try again.';
      throw new Error(errMsg);
    }
  }

  /**
   * Send One-Time Password (OTP) for Password Reset
   */
  static async sendOtpEmail(to, otp) {
    const html = `
      <div style="font-family: 'Outfit', 'Inter', sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #1F2937; background-color: #FAFAFA; border-radius: 24px; border: 1px solid #E5E7EB;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #FF5A5F; font-size: 32px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">PawMart</h1>
          <p style="font-size: 14px; color: #6B7280; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 5px;">Your Pet Marketplace</p>
        </div>
        
        <div style="background-color: #FFFFFF; padding: 30px; border-radius: 16px; border: 1px solid #F3F4F6; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <p style="font-size: 16px; font-weight: 600; color: #374151; margin-bottom: 20px;">Hello,</p>
          
          <p style="font-size: 15px; color: #4B5563; line-height: 1.6; margin-bottom: 25px;">
            We received a request to reset your PawMart account password. Use the following secure One-Time Password (OTP) to continue:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="display: inline-block; background-color: #F3F4F6; color: #FF5A5F; font-size: 36px; font-weight: 800; padding: 15px 35px; border-radius: 16px; letter-spacing: 6px; border: 2px dashed #FF5A5F;">
              ${otp}
            </div>
          </div>
          
          <p style="font-size: 13px; color: #9CA3AF; text-align: center; margin-bottom: 25px;">
            This OTP is valid for <strong>10 minutes</strong> and can only be used once.
          </p>
          
          <p style="font-size: 14px; color: #6B7280; line-height: 1.6; border-top: 1px solid #E5E7EB; pt-4; margin-top: 25px;">
            If you did not request this password reset, you can safely ignore this email.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; font-size: 12px; color: #9CA3AF; font-weight: 500;">
          <p>&copy; 2026 PawMart Inc. All rights reserved.</p>
        </div>
      </div>
    `;

    return this.sendHtmlEmail(to, 'Reset Your PawMart Password', html);
  }

  /**
   * Send Email Verification Link
   */
  static async sendEmailVerification(to, token) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Verify Your Email</h2>
        <p>Click the link below to verify your email address:</p>
        <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a>
      </div>
    `;
    return this.sendHtmlEmail(to, 'Verify Your Email Address', html);
  }

  /**
   * Send Welcome Email
   */
  static async sendWelcomeEmail(to, userName) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Welcome to PawMart, ${userName}!</h2>
        <p>We are excited to have you on board. Start browsing our marketplace now!</p>
      </div>
    `;
    return this.sendHtmlEmail(to, 'Welcome to PawMart', html);
  }

  /**
   * Send Order Confirmation Email
   */
  static async sendOrderConfirmation(to, orderId) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Order Confirmed!</h2>
        <p>Thank you for your order. Your order ID is ${orderId}.</p>
      </div>
    `;
    return this.sendHtmlEmail(to, 'Order Confirmation', html);
  }

  /**
   * Send Shipping Update Email
   */
  static async sendShippingUpdate(to, orderId) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your Order Has Shipped!</h2>
        <p>Order ${orderId} is on its way. Track your package on your dashboard.</p>
      </div>
    `;
    return this.sendHtmlEmail(to, 'Shipping Update', html);
  }

  /**
   * Send Delivery Update Email
   */
  static async sendDeliveryUpdate(to, orderId) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>Your Order Has Been Delivered!</h2>
        <p>Order ${orderId} has been successfully delivered. Enjoy your purchase!</p>
      </div>
    `;
    return this.sendHtmlEmail(to, 'Delivery Confirmation', html);
  }
}
