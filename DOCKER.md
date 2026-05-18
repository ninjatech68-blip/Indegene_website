# Docker (Frontend + Backend)

This repo can run fully in Docker: Postgres + Redis + backend CMS/API + static frontend.

## Prereqs

- Docker Desktop (or Docker Engine) with Compose v2 (`docker compose`).

## Start

From `C:\Users\Piyush.Sharma\Downloads\website`:

```powershell
# Required secrets (example values shown; replace before running)
$env:SESSION_SECRET="change-this-to-a-long-random-secret"
$env:DEFAULT_ADMIN_EMAIL="admin@your-domain.com"
$env:DEFAULT_ADMIN_PASSWORD="use-a-strong-admin-password"
$env:PRIVATE_PAGE_DEFAULT_USERNAME="partner-access-user"
$env:PRIVATE_PAGE_DEFAULT_PASSWORD="use-a-strong-private-page-password"

docker compose up --build
```

## URLs

- Frontend (nginx): http://localhost:8081
- Backend (express): http://localhost:4000
- Health check: http://localhost:4000/health

## Notes

- The backend requires explicit values for `SESSION_SECRET`, `DEFAULT_ADMIN_EMAIL`, `DEFAULT_ADMIN_PASSWORD`, `PRIVATE_PAGE_DEFAULT_USERNAME`, and `PRIVATE_PAGE_DEFAULT_PASSWORD`.
- Prisma migrations run once via the `migrate` service before the backend starts.
- Uploads are persisted in the `backend_uploads` named volume.
