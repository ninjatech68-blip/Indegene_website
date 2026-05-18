import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getCollectionConfig } from '../services/cms-models.js';
import { validateAdminCollectionPayload } from '../services/admin-api-validation.js';
import { toSlug } from '../utils/slug.js';

const router = Router();

router.use(requireAuth, requireRole('ADMIN', 'EDITOR'));

function coerceBoolean(value) {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 1) return true;
  if (value === 'false' || value === '0' || value === 0) return false;
  return Boolean(value);
}

function normalizePayload(model, payload) {
  const data = Object.fromEntries(
    Object.entries(payload).filter(([key]) => key !== '_csrf')
  );

  if ('slug' in data && data.slug) {
    data.slug = toSlug(data.slug);
  }

  if ('title' in data && !data.slug) {
    data.slug = toSlug(data.title);
  }

  if ('name' in data && !data.slug) {
    data.slug = toSlug(data.name);
  }

  if ('sortOrder' in data) {
    data.sortOrder = Number(data.sortOrder || 0);
  }

  if ('visibility' in data) {
    data.visibility = coerceBoolean(data.visibility);
  }

  if ('isVisible' in data) {
    data.isVisible = coerceBoolean(data.isVisible);
  }

  if ('isFeatured' in data) {
    data.isFeatured = coerceBoolean(data.isFeatured);
  }

  if ('value' in data && typeof data.value === 'string') {
    try {
      data.value = JSON.parse(data.value.trim());
    } catch (error) {
      data.value = data.value;
    }
  }

  ['body', 'config', 'structuredData'].forEach((field) => {
    if (typeof data[field] === 'string') {
      const trimmed = data[field].trim();
      if (!trimmed) {
        data[field] = null;
        return;
      }
      try {
        data[field] = JSON.parse(trimmed);
      } catch (error) {
        data[field] = data[field];
      }
    }
  });

  if ('publishedAt' in data && typeof data.publishedAt === 'string') {
    data.publishedAt = data.publishedAt ? new Date(data.publishedAt) : null;
    if (data.publishedAt && Number.isNaN(data.publishedAt.getTime())) {
      data.publishedAt = null;
    }
  }

  return data;
}

function parseMultiValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

function createHttpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.expose = true;
  if (details) {
    error.details = details;
  }
  return error;
}

function assertCollectionWritable(collection) {
  if (collection?.readOnly) {
    throw createHttpError(405, `${collection.label} is read only.`);
  }
}

function validateCollectionPayload(collectionKey, payload) {
  try {
    return validateAdminCollectionPayload(collectionKey, payload);
  } catch (error) {
    if (error?.name === 'ZodError') {
      throw createHttpError(400, 'Invalid admin payload.', error.issues);
    }
    throw error;
  }
}

async function buildAdminApiCredentialPayload(payload, existingItem = null) {
  const data = normalizePayload('privatePageCredential', payload);
  const password = String(payload.password || '').trim();

  if (!data.pageKey) {
    data.pageKey = 'partner-access';
  }

  if (password) {
    data.passwordHash = await bcrypt.hash(password, 10);
  } else if (!existingItem) {
    throw new Error('A password is required when creating a private page credential.');
  }

  delete data.password;
  delete data.assignedResourceIds;

  return data;
}

function buildAdminApiPrivatePageResourcePayload(payload) {
  const data = normalizePayload('privatePageResource', payload);

  if (!data.pageKey) {
    data.pageKey = 'partner-access';
  }

  return data;
}

async function syncPrivateCredentialResources(credentialId, pageKey, rawResourceIds) {
  const requestedIds = Array.from(new Set(parseMultiValue(rawResourceIds)));

  if (!requestedIds.length) {
    await prisma.privatePageCredentialResource.deleteMany({
      where: { credentialId }
    });
    return;
  }

  const allowedResources = await prisma.privatePageResource.findMany({
    where: {
      id: { in: requestedIds },
      pageKey
    },
    select: { id: true }
  });

  await prisma.privatePageCredentialResource.deleteMany({
    where: { credentialId }
  });

  if (!allowedResources.length) {
    return;
  }

  await prisma.privatePageCredentialResource.createMany({
    data: allowedResources.map((resource) => ({
      credentialId,
      resourceId: resource.id
    })),
    skipDuplicates: true
  });
}

router.get('/:collection', async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection) {
      return res.status(404).json({ error: 'NotFound', message: 'Collection not found' });
    }

    const items = await prisma[collection.model].findMany({
      take: 100,
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ data: items });
  } catch (error) {
    next(error);
  }
});

router.get('/:collection/:id', async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection) {
      return res.status(404).json({ error: 'NotFound', message: 'Collection not found' });
    }

    const item = await prisma[collection.model].findUnique({
      where: { id: req.params.id }
    });

    if (!item) {
      return res.status(404).json({ error: 'NotFound', message: `${collection.label} item not found` });
    }

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.post('/:collection', async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection) {
      return res.status(404).json({ error: 'NotFound', message: 'Collection not found' });
    }
    assertCollectionWritable(collection);

    const data = collection.model === 'privatePageCredential'
      ? validateCollectionPayload(req.params.collection, await buildAdminApiCredentialPayload(req.body))
      : collection.model === 'privatePageResource'
        ? validateCollectionPayload(req.params.collection, buildAdminApiPrivatePageResourcePayload(req.body))
        : validateCollectionPayload(req.params.collection, normalizePayload(collection.model, req.body));
    const item = await prisma[collection.model].create({ data });

    if (collection.model === 'privatePageCredential') {
      await syncPrivateCredentialResources(item.id, item.pageKey, req.body.assignedResourceIds);
    }

    res.status(201).json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.put('/:collection/:id', async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection) {
      return res.status(404).json({ error: 'NotFound', message: 'Collection not found' });
    }
    assertCollectionWritable(collection);

    const existingItem = await prisma[collection.model].findUnique({
      where: { id: req.params.id }
    });

    if (!existingItem) {
      return res.status(404).json({ error: 'NotFound', message: `${collection.label} item not found` });
    }

    const data = collection.model === 'privatePageCredential'
      ? validateCollectionPayload(req.params.collection, await buildAdminApiCredentialPayload(req.body, existingItem))
      : collection.model === 'privatePageResource'
        ? validateCollectionPayload(req.params.collection, buildAdminApiPrivatePageResourcePayload(req.body))
        : validateCollectionPayload(req.params.collection, normalizePayload(collection.model, req.body));
    const item = await prisma[collection.model].update({
      where: { id: req.params.id },
      data
    });

    if (collection.model === 'privatePageCredential') {
      await syncPrivateCredentialResources(item.id, item.pageKey, req.body.assignedResourceIds);
    }

    res.json({ data: item });
  } catch (error) {
    next(error);
  }
});

router.delete('/:collection/:id', async (req, res, next) => {
  try {
    const collection = getCollectionConfig(req.params.collection);
    if (!collection) {
      return res.status(404).json({ error: 'NotFound', message: 'Collection not found' });
    }
    assertCollectionWritable(collection);

    await prisma[collection.model].delete({
      where: { id: req.params.id }
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
