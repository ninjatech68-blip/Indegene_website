# OCO Backend CMS

This backend converts the current static OCO marketing website into a CMS-driven platform with:

- PostgreSQL-backed structured content
- Public APIs for page rendering
- Admin CMS for editors and administrators
- Form capture and lead storage
- Navigation management
- Media upload pipeline
- Analytics configuration

## Stack

- Node.js 22
- Express
- Prisma ORM
- PostgreSQL
- EJS admin views
- Multer + Sharp for media processing

## Quick Start

1. Copy `.env.example` to `.env`
2. Start infrastructure:
   - `docker compose up -d db redis`
3. Install dependencies:
   - `npm install`
4. Generate Prisma client:
   - `npm run prisma:generate`
5. Run migrations:
   - `npm run prisma:migrate`
6. Seed CMS defaults:
   - `npm run prisma:seed`
7. Start app:
   - `npm run dev`

Admin panel:

- URL: `http://localhost:4000/admin/login`
- Email: value from `DEFAULT_ADMIN_EMAIL` (required env variable)
- Password: value from `DEFAULT_ADMIN_PASSWORD` (required env variable)

## What Is CMS-Managed

- Homepage sections
- Service page sections
- Case studies
- Testimonials
- Resources / insights
- Client portfolio
- Navigation menus and items
- Analytics configuration
- Lead capture submissions

## Frontend Integration Pattern

The current HTML frontend can be progressively migrated by replacing hardcoded sections with API calls:

- `GET /api/public/pages/home`
- `GET /api/public/navigation/header`
- `GET /api/public/testimonials`
- `GET /api/public/clients`
- `GET /api/public/services`
- `POST /api/forms/contact`
- `POST /api/forms/newsletter`

See [docs/FRONTEND_INTEGRATION.md](./docs/FRONTEND_INTEGRATION.md) and [docs/API_REFERENCE.md](./docs/API_REFERENCE.md) for details.
