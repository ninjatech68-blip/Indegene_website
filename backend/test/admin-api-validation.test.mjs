import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAdminCollectionPayload } from '../src/services/admin-api-validation.js';

test('validates allowed testimonial payload', () => {
  const payload = validateAdminCollectionPayload('testimonials', {
    clientName: 'Client A',
    quote: 'Great execution quality.',
    sortOrder: 5
  });
  assert.equal(payload.clientName, 'Client A');
  assert.equal(payload.sortOrder, 5);
});

test('rejects invalid private resource url', () => {
  assert.throws(() => validateAdminCollectionPayload('privatePageResources', {
    pageKey: 'partner-access',
    title: 'Deck',
    resourceType: 'DOCUMENT',
    url: 'not-a-url'
  }));
});

test('passes through unknown collection payload unchanged', () => {
  const raw = { any: 'value', nested: { ok: true } };
  const payload = validateAdminCollectionPayload('unknownCollection', raw);
  assert.deepEqual(payload, raw);
});
