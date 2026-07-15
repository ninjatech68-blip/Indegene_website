import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';

const router = Router();
// Constant hash used to perform a dummy bcrypt.compare when a user is not
// found, so the not-found path takes comparable time to the found path and
// does not leak account existence via response timing.
const DUMMY_PASSWORD_HASH = '$2a$10$WDL2.d1BYkKlx.AmAYsUneZznz64JvFQHcBcc/peSHs26CRgVsvhK';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post('/login', authLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { email: req.body.email }
    });

    if (!user || !user.isActive || !user.passwordHash || typeof user.passwordHash !== 'string') {
      // Perform a dummy compare so the not-found/inactive path spends
      // comparable time to the found path (mitigates user enumeration).
      try {
        await bcrypt.compare(String(req.body.password), DUMMY_PASSWORD_HASH);
      } catch (compareError) {
        // Ignore; response is the same either way.
      }
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    let isMatch = false;
    try {
      isMatch = await bcrypt.compare(String(req.body.password), user.passwordHash);
    } catch (compareError) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }
    if (!isMatch) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return res.status(503).json({ error: 'ServiceUnavailable', message: 'Login is temporarily unavailable. Please try again.' });
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      };

      req.session.save((saveError) => {
        if (saveError) {
          return res.status(503).json({ error: 'ServiceUnavailable', message: 'Login is temporarily unavailable. Please try again.' });
        }

        return res.json({
          data: {
            user: req.session.user
          }
        });
      });
    });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (req, res, next) => {
  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie('oco.sid');
    res.status(204).send();
  });
});

router.get('/me', (req, res) => {
  res.json({
    data: {
      user: req.session?.user || null
    }
  });
});

export default router;
