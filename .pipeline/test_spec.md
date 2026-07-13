# Test Specification

> ⚠️ **Warning — `.pipeline/surface.json` was not found.** The API surface below was
> derived from the approved spec and verified directly against the implementation at
> `backend/app/main.py` / `backend/app/models.py`. Exactly five endpoints exist; there
> is no auth, admin, or settings surface. `.pipeline/tasks.md` speculatively layered a
> `full_auth` + admin-settings surface, but the approved spec designates "No auth, no
> user accounts" as authoritative and the code contains no such routes — those are
> listed under **Out of scope**.

## Coverage summary
- Total cases: 30
- API endpoints covered: 5 / 5 (derived; surface.json absent)
- User journeys covered: 6

## API tests

Path note: routes are absolute under the app origin (`/api/...`). Through the deployed
ingress they live under the sub-path `/faithful-e2e-d/api/...` (ingress
`rewrite-target: /$2` maps back to `/api/...`). Behaviour must be identical either way.

### `GET /api/health`
- **Happy path**: no input → `200` with JSON body exactly `{"status":"ok"}`; `Content-Type: application/json`.
- **Validation failures**: n/a (no parameters).
- **Auth failures**: n/a (no auth in scope).
- **Idempotency / edge cases**: repeated calls always `200` with identical body; performs no DB access, so returns `200` even if the DB is unreachable.

### `GET /api/health/deep`
- **Happy path**: DB reachable → executes `SELECT 1` → `200` with body `{"status":"ok"}`.
- **Validation failures**: n/a (no parameters).
- **Auth failures**: n/a.
- **Idempotency / edge cases**: DB open/query failure → `500` with body shape `{"status":"error","detail":<string>}`. Read-only probe: writes no rows, safe to repeat.

### `GET /api/notes`
- **Happy path (populated)**: with N notes → `200` and a JSON array of N `NoteOut` objects, each with keys `id` (int), `title` (str), `body` (str), `created_at` (ISO-8601 UTC str).
- **Ordering case**: create note A then note B → array is `[B, A]`, strictly `ORDER BY id DESC` (newest first).
- **Empty case**: no notes → `200` with body exactly `[]`.
- **Validation failures**: n/a (no parameters).
- **Auth failures**: n/a.
- **Idempotency / edge cases**: repeated GETs return the same set/order with no mutation.

### `POST /api/notes`
- **Happy path**: body `{"title":"Dune","body":"Great worldbuilding"}` → `201`; response is a `NoteOut` with a new integer `id`, echoed trimmed `title`/`body`, and a non-empty ISO-8601 UTC `created_at`. A subsequent `GET /api/notes` returns this note first.
- **Trimming case**: `{"title":"  Dune  ","body":"  ok  "}` → `201` with stored `title` == `"Dune"`, `body` == `"ok"`.
- **Boundary accept (not a failure)**: `title` of exactly 200 chars and `body` of exactly 1000 chars → `201`.
- **Validation failures** (each → `422`, no row inserted):
  - empty title `{"title":"","body":"x"}`.
  - whitespace-only title `{"title":"   ","body":"x"}` (must fail after trim).
  - empty body `{"title":"x","body":""}`.
  - whitespace-only body `{"title":"x","body":"   "}`.
  - over-length title: `title` of 201 characters.
  - over-length body: `body` of 1001 characters.
  - missing field: `{"title":"x"}` (no `body`) and `{}`.
  - wrong type: `{"title":123,"body":"x"}`.
  - malformed / non-JSON body → `422` (or `400`).
- **Auth failures**: n/a.
- **Idempotency / edge cases**: non-idempotent — two identical valid POSTs create two distinct rows with different `id`s (no uniqueness constraint).

### `DELETE /api/notes/{note_id}`
- **Happy path**: create a note, then `DELETE /api/notes/{id}` → `204` with empty body; a following `GET /api/notes` no longer includes that `id`.
- **Not-found case**: `DELETE /api/notes/999999` (nonexistent id) → `404` with body shape `{"detail":"note not found"}`.
- **Repeat-delete case**: delete a valid id (→ `204`), then delete the same id again → `404`.
- **Validation failures**: non-integer path param, e.g. `DELETE /api/notes/abc` → `422`.
- **Auth failures**: n/a.

## UI / journey tests

Rendered at `/` (served by the FastAPI static mount). The SPA uses relative fetch
(`api/notes`, no leading slash) so it works both at root and under the ingress sub-path
`/faithful-e2e-d/`. Journeys should also be exercised under the deployed sub-path to
validate the relative-fetch + ingress-rewrite path.

### Journey: Landing page renders
- **Steps**: navigate to `/`.
- **Expected outcomes**: page loads `200`; an `<h1>` contains the literal text `FaithfulD Book Notes`; the add-note form (`#title` input, `#body` textarea, submit button) and the `<ul id="notes">` container are present; `styles.css` and the JS load. Acceptance strings "faithfuld book notes" and "capture short notes about the books" appear in the rendered page.
- **Negative path**: if `GET /api/notes` fails on load, the list area shows a visible error/empty state rather than a blank crash.

### Journey: Add a note
- **Steps**: on `/`, type "The Hobbit" into `#title`, "Reread notes" into `#body`, submit.
- **Expected outcomes**: a `POST /api/notes` fires; on `201` the form clears and the list reloads with the new note appearing **at the top** (newest-first), showing title, body, timestamp, and a Delete button.
- **Negative path**: submitting with empty title or empty body creates no note (server returns `422`); a visible validation/error state is shown and the list is unchanged.

### Journey: Notes list ordering & empty state
- **Steps**: from an empty store, add note A then note B; observe the list. Separately, load `/` with no notes.
- **Expected outcomes**: after adding A then B, B appears above A. With no notes, the list shows a visible empty state (no error, no stray items).
- **Negative path**: n/a.

### Journey: Delete a note (inline confirmation)
- **Steps**: with at least one note present, click its Delete button → URL gains `?confirmDelete=<id>` and an inline confirm appears for that note → click confirm.
- **Expected outcomes**: clicking Delete sets `?confirmDelete=<id>` and shows an inline confirm without yet deleting; confirming fires `DELETE /api/notes/<id>`, the note disappears, and the `confirmDelete` param is cleared from the URL.
- **Negative path**: cancelling the confirm removes the `confirmDelete` param and leaves the note in place (no DELETE sent).

### Journey: Delete-confirm state restored from URL
- **Steps**: load `/?confirmDelete=<existing-id>` directly (deep link / refresh).
- **Expected outcomes**: on load the inline confirm UI for that note id is shown/restored from URL state, with no prior click.
- **Negative path**: `/?confirmDelete=<nonexistent-or-nonnumeric-id>` → page loads normally with no confirm prompt and no error.

### Journey: User text is rendered literally (no HTML injection)
- **Steps**: add a note with title `<b>x</b>` and body `<script>alert(1)</script>`.
- **Expected outcomes**: the list displays the literal characters `<b>x</b>` and `<script>alert(1)</script>` as text (rendered via `textContent`); no bold element is created, no script executes, no markup is injected into the DOM.
- **Negative path**: n/a — literal rendering is the assertion.

## Data integrity tests
- After a successful `POST /api/notes`, exactly one new row exists in `notes` with a non-null auto-increment `id`, non-empty (NOT NULL) trimmed `title`/`body`, and a non-null ISO-8601 UTC `created_at`.
- `id` is monotonically increasing across inserts, guaranteeing `ORDER BY id DESC` == newest-first.
- Stored `title`/`body` always satisfy the length limits (≤200 / ≤1000); the validation layer prevents any violating row from being written.
- After a `DELETE` returns `204`, the row is gone: it appears in neither `GET /api/notes` nor a repeat `DELETE` (which returns `404`).
- Startup bootstrap: on a fresh `DB_PATH` the parent directory and `notes` table are created (`CREATE TABLE IF NOT EXISTS`) with no manual migration.
- Persistence: notes written before a process restart against the same `DB_PATH` are still returned by `GET /api/notes` afterward (functional persistence; see caveat below).

## Out of scope
- **Authentication / user accounts / sessions** (`/login`, `/signup`, logout, role guards, `User` entity): the approved spec designates "No auth, no user accounts" as authoritative and the implementation has no such routes. The `full_auth` surface in `tasks.md` is intentionally not built and not tested.
- **Admin surface** (`/admin`, `/admin/settings`, `GET`/`PATCH /api/admin/settings`, `SystemSetting`): not implemented; out of scope for the same reason.
- **PostgreSQL / MinIO backing services and credential config**: SQLite at `DB_PATH` is the authoritative store; provisioned PG/MinIO are intentionally unwired, so their configuration is untested.
- **Cross-redeploy durability**: no volume is mounted at `/data`, so a full pod/redeploy loses the SQLite file. Functional persistence (same process/`DB_PATH`) is tested; durability across pod recreation is an ops caveat, explicitly out of scope (no PVC due to namespace `ResourceQuota` + `Recreate` strategy).
- **`web/` Angular scaffolding**: dead code never copied by the `Dockerfile`; not deployed, not tested.
- **Concurrent-writer / horizontal-scaling behaviour**: SQLite single-writer is acceptable per the spec's Risks; concurrency stress is out of scope.
- **CORS**: API and static SPA share one origin, so no cross-origin cases are tested.
- **Styling / visual regression of `styles.css`**: spec requires only a "minimal readable layout"; no pixel assertions.
- **Transient form-input URL state**: only the delete-confirmation state (`?confirmDelete=<id>`) is URL-addressable by design; unsaved form text is not persisted and not asserted.

Wrote .pipeline/test_spec.md (30 cases across 5 endpoints / 6 journeys).
