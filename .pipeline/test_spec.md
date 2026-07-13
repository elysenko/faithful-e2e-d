# Test Specification

> ⚠️ **Warning: `.pipeline/surface.json` was not found.** The API surface below is
> derived from the authoritative spec (`Implementation Plan` steps) and cross-checked
> against `.pipeline/tasks.md`. Per the spec's explicit assumption — *"No auth, no user
> accounts … the auth baseline is overridden by the authoritative spec"* — the
> `full_auth` and admin-settings surface that `tasks.md` speculatively layered on is
> treated as **out of scope** (see final section). Total endpoints under test: **5**.

## Coverage summary
- Total cases: 24
- API endpoints covered: 5 / 5 (derived from spec; no surface.json)
- User journeys covered: 4

## API tests

### `GET /api/health`
- **Happy path**: no input → `200` with body exactly `{"status":"ok"}` (`Content-Type: application/json`).
- **Validation failures**: n/a (no inputs).
- **Auth failures**: n/a (endpoint is public; app has no auth).
- **Idempotency / edge cases**: repeated calls always `200`; does not touch the DB.

### `GET /api/health/deep`
- **Happy path**: DB reachable → executes `SELECT 1` → `200` with an ok status body.
- **Validation failures**: n/a (no inputs).
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**: when the DB is unreachable / `SELECT 1` raises → `500` (not `200`). Read-only; no state change.

### `GET /api/notes`
- **Happy path (empty)**: fresh DB → `200` with body `[]`.
- **Happy path (populated)**: with N notes present → `200` with a JSON array of N `NoteOut` objects, each having keys `id` (int), `title` (str), `body` (str), `created_at` (ISO string).
- **Ordering**: create note A then note B → response array is `[B, A]` — strictly `ORDER BY id DESC` (newest first).
- **Validation failures**: n/a (no inputs).
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**: repeated GETs return the same set/order with no mutation.

### `POST /api/notes`
- **Happy path**: body `{"title":"Dune","body":"Great read"}` → `201`; returned `NoteOut` has a non-null integer `id`, echoes `title`/`body`, and a `created_at` that parses as a UTC ISO-8601 timestamp. The new note is subsequently returned first by `GET /api/notes`.
- **Validation failures** (each → `422`, no row inserted):
  - Missing `title` field.
  - Missing `body` field.
  - Empty-string `title` (`""`).
  - Empty-string `body` (`""`).
  - Whitespace-only `title` (`"   "`) — must fail after trim.
  - Whitespace-only `body` (`"   "`).
  - `title` longer than 200 chars.
  - `body` longer than 1000 chars.
  - Malformed / non-JSON body → `422` (or `400`).
- **Trimming**: `{"title":"  Dune  ","body":"  ok  "}` → `201` with values stored trimmed (`"Dune"`, `"ok"`).
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**: POST is non-idempotent — two identical POSTs create two distinct rows with different `id`s (both returned by GET, no uniqueness constraint).

### `DELETE /api/notes/{note_id}`
- **Happy path**: create a note, `DELETE /api/notes/{id}` → `204` (empty body). Subsequent `GET /api/notes` no longer includes that `id`.
- **Validation failures**: non-integer `note_id` (e.g. `/api/notes/abc`) → `422` (path type coercion).
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**:
  - Deleting an id that does not exist → `404`.
  - Deleting the same id twice → first `204`, second `404`.

## UI / journey tests

### Journey: Landing page renders
- **Steps**: navigate to `/`.
- **Expected outcomes**: page loads `200`; an `<h1>` contains the literal text `FaithfulD Book Notes`; the add-note form (`#title` input, `#body` textarea, submit button) and the `<ul id="notes">` container are present; `styles.css` and `app.js` are linked and load.
- **Negative path**: if `GET /api/notes` fails on load, the list area shows an error/empty state (per `app.js` states) rather than a blank crash.

### Journey: Add a note
- **Steps**: on `/`, type a title into `#title`, a body into `#body`, click submit.
- **Expected outcomes**: a `POST /api/notes` fires; on `201` the form clears and the notes list reloads with the new note appearing **at the top** (newest-first), showing title, body, and timestamp, plus a Delete button. User-entered text is rendered via `textContent` (no HTML injection — e.g. a title of `<b>x</b>` renders as literal text).
- **Negative path**: submitting with an empty title or empty body does not create a note (client and/or server rejects; server returns `422`); the list is unchanged.

### Journey: Delete a note with inline confirmation
- **Steps**: with at least one note present, click its Delete button → URL gains `?confirmDelete=<id>` and an inline confirm prompt appears → click confirm.
- **Expected outcomes**: `DELETE /api/notes/{id}` fires; on `204` the `confirmDelete` query param is cleared and the list reloads without the deleted note.
- **Negative path**: dismissing/cancelling the confirm leaves the note present and clears the param without issuing a DELETE.

### Journey: Delete-confirm state restored from URL
- **Steps**: load `/?confirmDelete=<existing-id>` directly (deep link / refresh).
- **Expected outcomes**: on load the inline confirm UI for that note id is shown (state is URL-addressable per the routing assumption).
- **Negative path**: `?confirmDelete=<nonexistent-or-nonnumeric-id>` → page loads normally with no confirm prompt and no error.

## Data integrity tests
- After `POST /api/notes`, exactly one new row exists in `notes` with a non-null auto-increment `id`, `title` and `body` non-empty (NOT NULL), and a non-null ISO `created_at`.
- `id` is monotonically increasing across inserts, guaranteeing `ORDER BY id DESC` == newest-first.
- After `DELETE` returns `204`, the row is absent (`SELECT` by that id returns no rows); a following identical DELETE finds nothing → `404`.
- Persistence: notes written before a process/container restart against the same `DB_PATH` volume are still returned by `GET /api/notes` afterward.
- Startup bootstrap: on a fresh `DB_PATH` the parent directory and `notes` table are created (`CREATE TABLE IF NOT EXISTS`) with no manual migration.

## Out of scope
- **Auth (`/login`, `/signup`, logout, session guards) and User/role model** — the authoritative spec explicitly lists "No auth, no user accounts" as a non-goal and overrides the pipeline `full_auth` baseline. Not built, not tested. (Flagged as an open question in `tasks.md`.)
- **Admin surface (`/admin`, `/admin/settings`, `GET`/`PATCH /api/admin/settings`, `SystemSetting`)** — depends on the auth layer above; out of scope for the same reason.
- **PostgreSQL / MinIO backing services and credential config** — the spec's authoritative persistence is local `sqlite3` at `DB_PATH`; provisioned PG/MinIO are not wired into the app, so their configuration is untested.
- **Concurrent-writer / horizontal-scaling behavior** — SQLite single-writer is acceptable for this low-traffic app per the spec's Risks; concurrency stress is explicitly out of scope.
- **CORS** — API and static SPA share one origin, so no cross-origin cases are tested.
- **Styling/visual regression of `styles.css`** — spec only requires "minimal readable layout"; no pixel assertions.

Wrote .pipeline/test_spec.md (24 cases across 5 endpoints / 4 journeys).
