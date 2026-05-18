# Frontend Integration

## Rendering Strategy

Recommended production rendering model:

- Next.js or Astro frontend for SSR/ISR
- Current static HTML can be incrementally migrated section by section
- Use slug-driven page fetching from the backend

## Section Mapping

### Homepage
- Hero: `page.slug=home`, section key `hero`
- Strategic Alliances: `page.slug=home`, section key `strategic-alliances`
- Testimonials: `GET /api/public/testimonials`
- Client logos: `GET /api/public/clients`
- Newsletter CTA: `page.slug=home`, section key `newsletter`

### Services
- `GET /api/public/pages/services`
- `GET /api/public/services`

### Case Studies
- Listing: `GET /api/public/case-studies`
- Detail: `GET /api/public/case-studies/:slug`

### Resources / Insights
- `GET /api/public/resources`

### Contact
- `GET /api/public/pages/contact`
- Form submission: `POST /api/forms/contact`

## Navigation

Drive header/footer/mobile navigation from:

- `GET /api/public/navigation/header`
- `GET /api/public/navigation/footer`

## Analytics

Expose GA4 configuration through:

- `GET /api/public/settings/analytics`

Event payloads from the frontend should include:

- `event_name`
- `page_slug`
- `component_key`
- `cta_label`
- `destination_url`
