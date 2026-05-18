import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const defaultPublicRoot = path.resolve(process.cwd(), '..');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:8081'),
  PUBLIC_ROOT: z.string().default(defaultPublicRoot),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(16),
  COOKIE_DOMAIN: z.string().default('localhost'),
  MEDIA_BASE_URL: z.string().url().default('http://localhost:4000/uploads'),
  GA4_MEASUREMENT_ID: z.string().optional().default(''),
  RECAPTCHA_SITE_KEY: z.string().optional().default(''),
  RECAPTCHA_SECRET: z.string().optional().default(''),
  SMTP_HOST: z.string().optional().default(''),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional().default(''),
  SMTP_PASS: z.string().optional().default(''),
  SMTP_FROM: z.string().optional().default('no-reply@example.com'),
  DEFAULT_ADMIN_EMAIL: z.string().email(),
  DEFAULT_ADMIN_PASSWORD: z.string().min(12),
  PRIVATE_PAGE_DEFAULT_USERNAME: z.string().min(3),
  PRIVATE_PAGE_DEFAULT_PASSWORD: z.string().min(12)
});

export const env = envSchema.parse(process.env);
export const isProduction = env.NODE_ENV === 'production';
