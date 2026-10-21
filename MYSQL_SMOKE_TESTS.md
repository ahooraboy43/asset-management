# Manual smoke-test checklist (before production)

Run this checklist on a staging URL using a fresh test database and HTTPS. Do not use real customer data during initial testing.

## Server setup
- [ ] PHP 8.1+ and PDO MySQL are enabled.
- [ ] Database schema imports without SQL errors.
- [ ] Private config file is outside public web root when hosting permits; no real credentials are committed.
- [ ] Visiting `api/auth.php` without a session returns JSON with `authenticated: false`.
- [ ] Visiting `api/state.php` without a session returns HTTP 401.
- [ ] The browser's Network panel shows API responses are not served from the service-worker cache.

## Authentication and isolation
- [ ] Register account A using a unique test email and a password of at least 12 characters.
- [ ] Register account B in a separate browser/private window.
- [ ] Account A and B each start with their own empty workspace.
- [ ] Save an asset in A; confirm it is not visible in B.
- [ ] Attempt a state PUT without a CSRF token; expect HTTP 403.
- [ ] Log out and back in; session rotates and the correct workspace reloads.
- [ ] Invalid email/password displays an error without exposing SQL details.

## Migration and data integrity
- [ ] Export the old app data to JSON before testing migration.
- [ ] With an empty SQL workspace and legacy browser data present, verify the import confirmation clearly warns that browser data may belong to another account.
- [ ] Accept migration; compare asset, reminder and service counts and inspect a sample of attachments/history.
- [ ] Verify local browser backup remains present after migration.
- [ ] Decline migration and confirm no local data is written into the SQL workspace.
- [ ] Create/edit/archive an asset; create/edit a reminder; add/edit/delete a service; reload and confirm SQL persistence.
- [ ] Check Persian/Jalali dates, costs, filters, reports and service-history rendering.

## Release gate
- [ ] Check PHP error logs and browser console.
- [ ] Test concurrent edits and network failure behavior.
- [ ] Make and restore a database backup.
- [ ] Only deploy after every critical test passes.
