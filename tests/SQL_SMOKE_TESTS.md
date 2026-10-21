# Manual smoke-test checklist (before production)

Run on a staging URL with a fresh test database and HTTPS. Do not use real customer data for the initial tests.

## Server setup
- [ ] PHP 8.1+ and PDO MySQL enabled.
- [ ] Import `database/schema.sql` with no SQL errors.
- [ ] Private config is outside the public web root where possible; no credentials are committed.
- [ ] `GET api/auth.php` without a session returns `authenticated: false`.
- [ ] `GET api/state.php` without a session returns HTTP 401.
- [ ] Network panel confirms API responses are not served from service-worker cache.

## Authentication and isolation
- [ ] Register test account A and test account B in separate browser profiles.
- [ ] Both accounts start with separate workspaces.
- [ ] Save an asset in A and verify it is not visible in B.
- [ ] Attempt a state PUT without a CSRF token; expect HTTP 403.
- [ ] Log out and back in; the correct workspace reloads.
- [ ] Invalid credentials do not expose SQL errors.

## Migration and persistence
- [ ] Export the old app data to JSON before migration.
- [ ] With an empty SQL workspace and local data present, verify the import prompt warns local data might belong to another account.
- [ ] Accept migration and compare asset/reminder/service counts, dates, costs, history, and attachments.
- [ ] Confirm the local backup remains after migration.
- [ ] Decline migration and verify nothing is imported into SQL.
- [ ] Add/edit/archive an asset, add/edit a reminder, add/edit/delete a service; reload and verify persistence.
- [ ] Test Jalali calendar, filters, reports and service history.

## Release gate
- [ ] Review PHP logs and browser console.
- [ ] Test a network failure and restore from database backup.
- [ ] Do not deploy to production until critical tests pass.
