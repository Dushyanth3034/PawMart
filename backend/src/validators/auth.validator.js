import { z } from 'zod';

const passwordValidation = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z0-9]).{8,}$/, 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');

export const registerSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: passwordValidation,
  role: z.enum(['BUYER', 'SELLER', 'SERVICE_PROVIDER', 'ADMIN']).default('BUYER'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: passwordValidation,
});
