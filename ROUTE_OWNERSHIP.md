# Route Ownership

This file defines which routes are public, which are CMS-managed, and which are intentionally non-public.

## Public Website Routes (CMS-managed)

These pages are part of the live website journey and are owned by `/admin/pages/slug/:slug`.

| Slug | File | Admin Path |
| --- | --- | --- |
| `home` | `index.html` | `/admin/pages/slug/home` |
| `services` | `services.html` | `/admin/pages/slug/services` |
| `contact` | `contactus.html` | `/admin/pages/slug/contact` |
| `case-studies` | `casestudy.html` | `/admin/pages/slug/case-studies` |
| `resources` | `genai.html` | `/admin/pages/slug/resources` |
| `biopharmaceuticals` | `biopharmaceuticals.html` | `/admin/pages/slug/biopharmaceuticals` |
| `emerging-biotech` | `emerging-biotech.html` | `/admin/pages/slug/emerging-biotech` |
| `medical-devices` | `medical-devices.html` | `/admin/pages/slug/medical-devices` |
| `animal-health` | `animal-health.html` | `/admin/pages/slug/animal-health` |
| `strategy` | `strategy.html` | `/admin/pages/slug/strategy` |
| `planning` | `planning.html` | `/admin/pages/slug/planning` |
| `orchestration` | `orchestration.html` | `/admin/pages/slug/orchestration` |
| `execution` | `execution.html` | `/admin/pages/slug/execution` |
| `measurement` | `measurement.html` | `/admin/pages/slug/measurement` |
| `analytics` | `analytics.html` | `/admin/pages/slug/analytics` |
| `by-role` | `by_role.html` | `/admin/pages/slug/by-role` |
| `by-function` | `by_function.html` | `/admin/pages/slug/by-function` |
| `by-channel` | `by_channel.html` | `/admin/pages/slug/by-channel` |

## Shared CMS Collections

These do not map to one public route; they are shared across pages.

- `caseStudies`: case study detail content and proof story records.
- `testimonials`: shared quote/testimonial content.
- `clients`: trust/platform logo records.
- `settings`: shared copy (footer/legal/global snippets).
- `mediaAssets`: reusable media files.
- `formSubmissions`: contact/newsletter inbox.
- `privatePageResources`: protected partner resource records.
- `privatePageCredentials`: credentials for protected partner access.

## Intentional Non-public Routes

These files may exist in the package but are intentionally excluded from public navigation.

- `partner-access.html`: protected route owned by partner resource + credential collections.
- `briefing-room.html`: alias route that redirects to `partner-access.html`.
- `indegene revitalizes.html`: support/detail chrome page owned by case study records.

## Health Endpoints

- Backend health: `/`, `/health`, `/api/health` (JSON health payload).
- Frontend shell: `/` on frontend host serves static website shell.
