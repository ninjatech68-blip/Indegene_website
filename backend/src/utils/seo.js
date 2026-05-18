export function buildSeoPayload(record = {}) {
  return {
    title: record.seoTitle || record.title || '',
    description: record.seoDescription || record.excerpt || record.summary || '',
    canonicalUrl: record.seoCanonicalUrl || '',
    structuredData: record.structuredData || null
  };
}

export function withMeta(data, meta = {}) {
  return { data, meta };
}
