# Docker (Frontend + Backend)

This repo can run fully in Docker: Postgres + backend CMS/API + static frontend.

## Prereqs

- Docker Desktop (or Docker Engine) with Compose v2 (`docker compose`).

## Start

From `<project-root>`:

```powershell
# Required secrets (example values shown; replace before running)
$env:POSTGRES_PASSWORD="change-this-to-a-strong-db-password"
$env:SESSION_SECRET="change-this-to-a-32-plus-char-random-secret"
$env:DEFAULT_ADMIN_EMAIL="admin@your-domain.com"
$env:DEFAULT_ADMIN_PASSWORD="use-a-strong-admin-password"
$env:PRIVATE_PAGE_DEFAULT_USERNAME="partner-access-user"
$env:PRIVATE_PAGE_DEFAULT_PASSWORD="use-a-strong-private-page-password"

docker compose up --build
```

## URLs

- Frontend (nginx): http://localhost:8081
- Admin/API (proxied through nginx): http://localhost:8081/admin and http://localhost:8081/api

The backend is not published to the host directly; it is reachable only through nginx on the internal compose network.

## Notes

- The backend requires explicit values for `POSTGRES_PASSWORD`, `SESSION_SECRET`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `PRIVATE_PAGE_DEFAULT_USERNAME`, and `PRIVATE_PAGE_DEFAULT_PASSWORD`.
- Prisma migrations run once via the `migrate` service (`prisma migrate deploy`) before the backend starts. Seeding is a deliberate manual step (`npm run prisma:seed`), not run on boot.
- Uploads are persisted in the `backend_uploads` named volume.
