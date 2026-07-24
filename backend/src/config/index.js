import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

const requiredEnv = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'BREVO_API_KEY',
  'BREVO_SENDER_NAME',
  'BREVO_SENDER_EMAIL',
  'GOOGLE_CLIENT_ID',
];

for (const envVar of requiredEnv) {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  brevoApiKey: process.env.BREVO_API_KEY,
  brevoSenderName: process.env.BREVO_SENDER_NAME,
  brevoSenderEmail: process.env.BREVO_SENDER_EMAIL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  platformCommissionRate: parseFloat(process.env.PLATFORM_COMMISSION_RATE || '0.10'),
};
