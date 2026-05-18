# Architecture Overview

## Current Target State

The backend is now strictly an admin and API service.

Public website rendering is fully handled by the frontend static layer.

## Runtime Shape

### Backend responsibilities
- Admin UI and admin actions under `/admin`.
- Public CMS/data APIs under `/api/public`.
- Auth, forms, uploads, and admin API endpoints under `/api`.

### Content access layer
- `src/services/site-content.js` is the authoritative query layer for public content.
- All backend consumers (admin and public APIs) read from the same service layer.
- Navigation, pages, testimonials, services, case studies, resources, and settings are queried centrally.

## Why This Structure Is Better

- Backend attack surface is smaller: no public HTML rendering routes.
- Public delivery concerns stay isolated in the frontend runtime.
- Admin/CMS and content APIs remain centralized and reusable.
- Operational ownership is clearer between frontend hosting and backend service.

## Next Scaling Steps

- Expand structured proof models for case studies and results panels.
- Add caching for high-volume API payloads (navigation/settings/bootstrap).
- Move uploads to object storage in production.
- Add API response contracts/versioning for safer frontend rollouts.
