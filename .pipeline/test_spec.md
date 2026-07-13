# Test Specification

> ⚠️ **Warning: `.pipeline/surface.json` was not found.** The API surface below is
> derived from the authoritative spec (`Implementation Plan`, Steps 1–2) and
> cross-checked against the **Surface contract** in `.pipeline/tasks.md`. Total
> endpoints under test: **5**.
>
> **Serving model note.** The deployed frontend is `backend/static/` (vanilla ES
> modules: `js/main.js` + `api.js`, `note-form.js`, `note-card.js`, `notes-list.js`,
> `format.js`, `url-state.js`), *not* the non-deployed `web/frontend/` Angular
> scaffolding. The client calls API paths **without a leading slash** (`api/notes`)
> so the app works under the ingress sub-path `/faithful-e2e-d/`. Per the spec's
> explicit assumption *"No auth"*, the `full_auth` / admin-settings surface that the
> pipeline baseline layered on is **out of scope** (see final section).

## Coverage summary
- Total cases: 30
- API endpoints covered: 5 / 5 (derived from spec; no surface.json)
- User journeys covered: 6

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
- **Idempotency / edge cases**: when the DB is unreachable / `SELECT 1` raises (e.g. `DB_PATH` points at an unwritable/absent file) → `500`, not `200`. Read-only; no state change.

### `GET /api/notes`
- **Happy path (empty)**: fresh DB → `200` with body `[]`.
- **Happy path (populated)**: with N notes present → `200` with a JSON array of N `NoteOut` objects, each having keys `id` (int), `title` (str), `body` (str), `created_at` (ISO string) — and no extra keys.
- **Ordering**: create note A then note B → response array is `[B, A]` — strictly `ORDER BY id DESC` (newest first).
- **Validation failures**: n/a (no inputs).
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**: repeated GETs return the same set/order with no mutation.

### `POST /api/notes`
- **Happy path**: body `{"title":"Dune","body":"Great read"}` → `201`; returned `NoteOut` has a non-null integer `id`, echoes the (trimmed) `title`/`body`, and a `created_at` that parses as a UTC ISO-8601 timestamp. The new note is subsequently returned **first** by `GET /api/notes`.
- **Validation failures** (each → `422`, no row inserted):
  - Missing `title` field.
  - Missing `body` field.
  - Empty-string `title` (`""`).
  - Empty-string `body` (`""`).
  - Whitespace-only `title` (`"   "`) — must fail *after* trim.
  - Whitespace-only `body` (`"   "`) — must fail after trim.
  - `title` longer than 200 chars → `422`.
  - `body` longer than 1000 chars → `422`.
  - Malformed / non-JSON request body → `422` (or `400`).
- **Trimming (boundary)**: `{"title":"  Dune  ","body":"  ok  "}` → `201` with values stored trimmed (`"Dune"`, `"ok"`). A title of exactly 200 chars and body of exactly 1000 chars (post-trim) → `201` (boundary accepted).
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**: POST is non-idempotent — two identical POSTs create two distinct rows with different `id`s (both returned by GET; no uniqueness constraint).

### `DELETE /api/notes/{note_id}`
- **Happy path**: create a note, `DELETE /api/notes/{id}` → `204` (empty body). Subsequent `GET /api/notes` no longer includes that `id`.
- **Validation failures**: non-integer `note_id` (e.g. `/api/notes/abc`) → `422` (path type coercion).
- **Auth failures**: n/a (public).
- **Idempotency / edge cases**:
  - Deleting an id that does not exist → `404`.
  - Deleting the same id twice → first `204`, second `404`.

## UI / journey tests

### Journey: Landing page renders
- **Steps**: navigate to `/` (equivalently, under the ingress, `/faithful-e2e-d/`).
- **Expected outcomes**: page loads `200`; an `<h1>` contains the literal text `FaithfulD Book Notes` and `<title>` contains `FaithfulD`; the add-note form (`#title` input, `#body` textarea, submit button) and the `<ul id="notes">` container are present; `styles.css` and `js/main.js` are linked and load (200).
- **Negative path**: if `GET /api/notes` fails on load, the notes area shows an explicit error state (and empty state shows for `[]`) rather than a blank/crashed page.

### Journey: Add a note
- **Steps**: on `/`, type a title into `#title`, a body into `#body`, click submit.
- **Expected outcomes**: a `POST api/notes` (relative path) fires; on `201` the form inputs clear and the notes list reloads with the new note appearing **at the top** (newest-first), showing title, body, a formatted timestamp, and a Delete button.
- **Negative path**: submitting with an empty/whitespace title or body does not create a note (server returns `422`); the list is unchanged and no phantom item is appended.

### Journey: XSS / HTML-injection safety
- **Steps**: add a note with title `<b>x</b>` and body `<img src=x onerror=alert(1)>`.
- **Expected outcomes**: the note renders the markup as **literal text** (written via `textContent`), producing no bold element, no image request, and no script execution. The stored/echoed value round-trips unchanged through `GET /api/notes`.
- **Negative path**: n/a (this journey *is* the negative-safety assertion).

### Journey: Delete a note with inline confirmation
- **Steps**: with at least one note present, click its Delete button → URL gains `?confirmDelete=<id>` and an inline confirm prompt appears for that note → click confirm.
- **Expected outcomes**: `DELETE api/notes/{id}` fires; on `204` the `confirmDelete` query param is cleared from the URL and the list reloads without the deleted note.
- **Negative path**: dismissing/cancelling the confirm leaves the note present and clears the `confirmDelete` param **without** issuing a DELETE.

### Journey: Delete-confirm state restored from URL (deep link / refresh)
- **Steps**: load `/?confirmDelete=<existing-id>` directly (deep link or refresh while a confirm is open).
- **Expected outcomes**: on load the inline confirm UI for that note id is reconstructed from the URL via `url-state.js` (state is URL-addressable).
- **Negative path**: `/?confirmDelete=<nonexistent-or-nonnumeric-id>` (e.g. `abc`) → page loads cleanly with no confirm prompt and no console/error crash.

### Journey: Serving under the ingress sub-path
- **Steps**: load the app under `/faithful-e2e-d/` and perform list/add/delete.
- **Expected outcomes**: because the client uses relative paths (`api/notes`, no leading slash), all API calls resolve under the sub-path prefix and succeed; no request is issued to a root-absolute `/api/...` that would 404 behind the ingress.
- **Negative path**: n/a (any regression to leading-slash paths surfaces as failed list/add/delete under the sub-path).

## Data integrity tests
- After `POST /api/notes`, exactly one new row exists in `notes` with a non-null auto-increment `id`, non-empty `title`/`body` (NOT NULL, post-trim), and a non-null UTC ISO `created_at`.
- `id` is monotonically increasing across inserts, guaranteeing `ORDER BY id DESC` == newest-first.
- After `DELETE` returns `204`, the row is absent (`SELECT` by that id returns no rows); a following identical DELETE finds nothing → `404`.
- **Persistence**: notes written before a process restart against the same `DB_PATH` file (`/data/faithfuld.db` in-container, `./faithfuld.db` locally) are still returned by `GET /api/notes` afterward.
- **Startup bootstrap**: on a fresh `DB_PATH`, `init_db()` (via lifespan) creates the parent `/data` directory and the `notes` table (`CREATE TABLE IF NOT EXISTS`) idempotently, with no manual migration.
- **Route precedence**: the catch-all `StaticFiles` mount at `/` is registered last, so `/api/*` routes resolve to the API and are never shadowed by the static handler.

## Build / deploy consistency tests
- **`npm run build` gate**: after Step 3, `npm ci && npm run build` exits `0` (root `build` script is a no-op that does not attempt to run the deleted `web/build.mjs` and does not overwrite `backend/static/`).
- **Docker image serves committed frontend**: `docker build` (repo `Dockerfile`) produces an image that runs `uvicorn backend.app.main:app` and serves the committed `backend/static/` assets; the Angular `web/frontend/` output is *not* copied into the image.

## Out of scope
- **Auth (`/login`, `/signup`, logout, session guards) and User/role model** — the authoritative spec explicitly lists "No auth" as a non-goal and overrides the pipeline `full_auth` baseline. Not built, not tested. A regression guard asserts these routes do **not** respond.
- **Admin surface (`/admin`, `/admin/settings`, `GET`/`PATCH /api/admin/settings`, `SystemSetting`)** — depends on the excluded auth layer; out of scope for the same reason, with the same regression guard.
- **PostgreSQL / MinIO backing services and credential config** — the spec's authoritative persistence is local `sqlite3` at `DB_PATH`; any provisioned PG/MinIO is not wired into the app, so its configuration is untested.
- **`web/frontend/` (Angular) build output** — non-deployed scaffolding; editing or building it has zero effect on the live app, so it is not exercised as source of truth.
- **Concurrent-writer / horizontal-scaling behavior** — SQLite single-writer is acceptable for this low-traffic app per the spec's Risks; concurrency stress is explicitly out of scope.
- **`/data` PVC provisioning** — durability across pod/container recreation depends on an infra volume mount; that is an ops decision, not code under test here.
- **CORS** — API and static SPA share one origin, so no cross-origin cases are tested.
- **Styling/visual regression of `styles.css`** — spec only requires a minimal readable layout; no pixel assertions.

Wrote .pipeline/test_spec.md (30 cases across 5 endpoints / 6 journeys).
