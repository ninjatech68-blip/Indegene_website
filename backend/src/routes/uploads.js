import fs from 'node:fs/promises';
import path from 'node:path';
import { Router } from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();
const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'image/avif']);
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const uploadsDir = path.resolve(process.cwd(), 'uploads');

function sanitizeOriginalFilename(input) {
  const base = path.basename(String(input || 'file'));
  const normalized = base
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  return normalized || 'file';
}

router.post('/', requireAuth, requireRole('ADMIN', 'EDITOR'), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'ValidationError', message: 'File is required' });
    }

    if (!allowedMimeTypes.has(req.file.mimetype)) {
      return res.status(400).json({ error: 'ValidationError', message: 'Unsupported file type' });
    }

    await fs.mkdir(uploadsDir, { recursive: true });

    const safeName = sanitizeOriginalFilename(req.file.originalname);
    const fileName = `${Date.now()}-${safeName}.webp`;
    const outputPath = path.join(uploadsDir, fileName);
    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();

    await image.webp({ quality: 82 }).toFile(outputPath);

    const media = await prisma.mediaAsset.create({
      data: {
        fileName,
        mimeType: 'image/webp',
        path: outputPath,
        publicUrl: `${env.MEDIA_BASE_URL}/${fileName}`,
        altText: req.body.altText || null,
        width: metadata.width || null,
        height: metadata.height || null,
        sizeBytes: req.file.size
      }
    });

    res.status(201).json({ data: media });
  } catch (error) {
    next(error);
  }
});

export default router;
