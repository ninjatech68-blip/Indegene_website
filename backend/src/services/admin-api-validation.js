import { z } from 'zod';

const optionalUrl = z.union([z.string().url(), z.literal(''), z.null()]).optional();

const sharedSeoFields = {
  seoTitle: z.string().max(160).nullish(),
  seoDescription: z.string().max(320).nullish()
};

const schemas = {
  pages: z.object({
    title: z.string().min(1).max(160),
    heroTitle: z.string().min(1).max(200).nullish(),
    heroSubtitle: z.string().max(2000).nullish(),
    heroKicker: z.string().max(120).nullish(),
    heroPrimaryLabel: z.string().max(120).nullish(),
    heroPrimaryUrl: optionalUrl,
    heroSecondaryLabel: z.string().max(120).nullish(),
    heroSecondaryUrl: optionalUrl,
    ...sharedSeoFields
  }).passthrough(),
  caseStudies: z.object({
    slug: z.string().min(1).max(160).nullish(),
    title: z.string().min(1).max(200),
    excerpt: z.string().max(1200).nullish(),
    content: z.string().max(50000).nullish(),
    sourceUrl: optionalUrl,
    status: z.enum(['DRAFT', 'PUBLISHED']).nullish(),
    publishedAt: z.date().nullish(),
    isFeatured: z.boolean().nullish(),
    structuredData: z.record(z.any()).nullish(),
    ...sharedSeoFields
  }).passthrough(),
  testimonials: z.object({
    clientName: z.string().min(1).max(120),
    role: z.string().max(120).nullish(),
    company: z.string().max(120).nullish(),
    quote: z.string().min(1).max(2000),
    isVisible: z.boolean().nullish(),
    sortOrder: z.number().int().min(0).max(9999).nullish()
  }).passthrough(),
  clients: z.object({
    slug: z.string().min(1).max(160).nullish(),
    name: z.string().min(1).max(120),
    description: z.string().max(1000).nullish(),
    websiteUrl: optionalUrl,
    isVisible: z.boolean().nullish(),
    sortOrder: z.number().int().min(0).max(9999).nullish()
  }).passthrough(),
  settings: z.object({
    key: z.string().min(1).max(160),
    description: z.string().max(240).nullish(),
    value: z.any()
  }).passthrough(),
  privatePageResources: z.object({
    pageKey: z.string().min(1).max(80),
    title: z.string().min(1).max(160),
    resourceType: z.enum(['PRESENTATION_DECK', 'LIVE_DEMO', 'DOCUMENT', 'OTHER']),
    description: z.string().max(1200).nullish(),
    url: z.string().url(),
    ctaLabel: z.string().max(120).nullish(),
    isVisible: z.boolean().nullish(),
    sortOrder: z.number().int().min(0).max(9999).nullish()
  }).passthrough(),
  privatePageCredentials: z.object({
    pageKey: z.string().min(1).max(80),
    username: z.string().min(1).max(120),
    description: z.string().max(240).nullish(),
    isActive: z.boolean().nullish(),
    passwordHash: z.string().min(20).nullish()
  }).passthrough()
};

export function validateAdminCollectionPayload(collectionKey, payload) {
  const schema = schemas[collectionKey];
  if (!schema) {
    return payload;
  }

  return schema.parse(payload);
}
