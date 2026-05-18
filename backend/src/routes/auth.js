import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '../lib/prisma.js';
import { validate } from '../middleware/validate.js';

const router = Router();
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

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(req.body.password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
    }

    req.session.regenerate((regenerateError) => {
      if (regenerateError) {
        return next(regenerateError);
      }

      req.session.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      };

      req.session.save((saveError) => {
        if (saveError) {
          return next(saveError);
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
