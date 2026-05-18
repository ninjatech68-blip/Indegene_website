import { Router } from 'express';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';
import { verifyRecaptcha } from '../utils/recaptcha.js';

const router = Router();

const contactSchema = z.object({
  fullName: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().trim().regex(/^[0-9+\-() ]{7,30}$/, 'Phone number format is invalid').optional().or(z.literal('')),
  company: z.string().min(2).max(120).optional().or(z.literal('')),
  message: z.string().min(10).max(2000),
  sourcePage: z.string().max(200).optional(),
  recaptchaToken: z.string().optional()
});

const newsletterSchema = z.object({
  email: z.string().email(),
  sourcePage: z.string().max(200).optional(),
  recaptchaToken: z.string().optional()
});

function sanitizePayload(data) {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      typeof value === 'string' ? sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }).trim() : value
    ])
  );
}

router.post('/contact', validate(contactSchema), async (req, res, next) => {
  try {
    const payload = sanitizePayload(req.body);
    const captcha = await verifyRecaptcha(req.body.recaptchaToken, req.ip);
    if (!captcha.success) {
      return res.status(400).json({ error: 'ValidationError', message: 'reCAPTCHA validation failed', details: captcha });
    }
    const submission = await prisma.formSubmission.create({
      data: {
        formType: 'CONTACT',
        fullName: payload.fullName,
        email: payload.email,
        phone: payload.phone || null,
        company: payload.company || null,
        message: payload.message,
        sourcePage: payload.sourcePage || null,
        meta: {
          ip: req.ip,
          userAgent: req.get('user-agent') || '',
          captcha
        }
      }
    });

    res.status(201).json({
      data: submission,
      message: 'Your enquiry has been received'
    });
  } catch (error) {
    next(error);
  }
});

router.post('/newsletter', validate(newsletterSchema), async (req, res, next) => {
  try {
    const payload = sanitizePayload(req.body);
    const captcha = await verifyRecaptcha(req.body.recaptchaToken, req.ip);
    if (!captcha.success) {
      return res.status(400).json({ error: 'ValidationError', message: 'reCAPTCHA validation failed', details: captcha });
    }
    const submission = await prisma.formSubmission.create({
      data: {
        formType: 'NEWSLETTER',
        email: payload.email,
        sourcePage: payload.sourcePage || null,
        meta: {
          ip: req.ip,
          userAgent: req.get('user-agent') || '',
          captcha
        }
      }
    });

    res.status(201).json({
      data: submission,
      message: 'Subscription recorded'
    });
  } catch (error) {
    next(error);
  }
});

export default router;
