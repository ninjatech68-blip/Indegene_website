# CSP Rollout Plan

## Goal
Remove `'unsafe-inline'` from enforced CSP without breaking frontend behavior.

## Phase 1 (current)
- Keep enforced CSP compatible for runtime stability.
- Add strict `Content-Security-Policy-Report-Only` header.
- Collect violations at `POST /api/security/csp-report`.
- Inventory inline code with `npm run csp:inventory`.

## Phase 2
- Migrate inline scripts from HTML into versioned external JS files.
- Eliminate inline event handlers (`onclick`, etc.).
- Re-run inventory until `inlineScripts=0` and `inlineHandlers=0` for all target pages.

## Phase 3
- Move report-only strict policy to enforced CSP.
- Remove `'unsafe-inline'` from enforced `script-src` and `style-src`.
- Keep report-only for one release cycle as a safety net.

## Release Gates
- `npm run test:e2e:critical`
- `npm run test:e2e:links`
- `npm run test:e2e:a11y`
- `npm run test:ci:lighthouse`
- `npm run csp:inventory`

## Rollback
- Revert to prior nginx CSP header if critical user flows fail.
- Keep `/api/security/csp-report` enabled for post-rollback diagnostics.
