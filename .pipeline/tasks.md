# Pipeline Task Decomposition

## Summary
FaithfulD Book Notes is a single-page book-notes app: a FastAPI backend with a stdlib `sqlite3` datastore and a vanilla-JS static frontend served by FastAPI's `StaticFiles`. Users can list notes newest-first, create a note (title + body), and delete a note through an inline, URL-addressable confirmation step (`?confirmDelete=<id>`). The codebase is already fully implemented and deployed from the `backend/` tree; this decomposition is a **verification-and-guard** pass to confirm every spec requirement holds and that no out-of-scope surface is introduced. The spec's Non-goals explicitly exclude auth, user accounts, admin, Postgres, and MinIO, and the user forbids re-scoping — so those baseline features are intentionally **not** part of the surface contract.

## Surface contract
**Entities**
- `Note`: `id` (INTEGER PK AUTOINCREMENT), `title` (≤200 chars, trimmed, non-empty), `body` (≤1000 chars, trimmed, non-empty), `created_at` (UTC ISO string).

**API routes** (in `backend/app/main.py`)
- `GET /api/health` → 200 `{"status":"ok"}`
- `GET /api/health/deep` → 200 after `SELECT 1` (DB reachable), 500 if not
- `GET /api/notes` → 200 `list[NoteOut]`, `ORDER BY id DESC` (newest-first)
- `POST /api/notes` → 201 `NoteOut` (server sets UTC ISO `created_at`); invalid input → 422
- `DELETE /api/notes/{note_id}` → 204 on success, 404 if absent

**Screens / UI** (`backend/static/`)
- `/` — single-page app: `<h1>FaithfulD Book Notes</h1>`, `<title>` containing "FaithfulD", add-note form (`#title` input, `#body` textarea, submit), `<ul id="notes">` list container.
- Delete flow: inline confirmation driven by `?confirmDelete=<id>`, restored on load via `url-state.js`.

**Explicitly out of scope (do NOT generate):** `/login`, `/signup`, logout, auth guards, admin route group, `/admin/settings`, `User`/role models, `SystemSetting` model, `resolveConfig`/`lib/config`, `/api/admin/settings`, Postgres, MinIO, and integration client modules. These contradict the approved spec's Non-goals — see Open questions.

## db_agent tasks
- [ ] Verify `backend/app/db.py`: `get_conn()` uses row factory `sqlite3.Row`, and `init_db()` creates the parent dir of `DB_PATH` plus `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`. No edit expected.
- [ ] Verify the persistence path resolves to `DB_PATH=/data/faithfuld.db` in-container and `./faithfuld.db` locally, and that `init_db()` is idempotent across process restarts (create-if-missing).
- [ ] Confirm newest-first ordering is supported by the autoincrement `id` PK (`ORDER BY id DESC`); no separate index/column required.
- [ ] Guard: confirm NO `User`, `UserRole`, `SystemSetting`, or Postgres tables/migrations exist or are added — schema is `notes` only, per spec Non-goals.

## backend_agent tasks
- [ ] Verify `backend/app/main.py` route surface and behavior: `GET /api/health` → `{"status":"ok"}`; `GET /api/health/deep` runs `SELECT 1`; `GET /api/notes` selects `ORDER BY id DESC` → `list[NoteOut]`; `POST /api/notes` validates `NoteCreate`, sets UTC ISO `created_at`, inserts, returns 201 `NoteOut`; `DELETE /api/notes/{note_id}` → 204 on delete, 404 if absent.
- [ ] Verify the catch-all `StaticFiles` mount at `/` is registered **last**, after every `/api/*` route, so API routes win. Preserve this ordering.
- [ ] Verify `backend/app/models.py`: `NoteCreate(title, body)` trims and rejects empty title/body and enforces `title ≤ 200` / `body ≤ 1000` (violations → 422 via Pydantic); `NoteOut(id, title, body, created_at)` shape correct.
- [ ] Verify `backend/requirements.txt` pins `fastapi==0.111.0`, `uvicorn[standard]==0.30.1`, `pydantic==2.7.4`; DB uses stdlib `sqlite3` (no new deps).
- [ ] Guard against out-of-scope drift: confirm NO auth/login/signup/logout endpoints, admin guard middleware, `(admin)` route group, `resolveConfig`/`lib/config`, `/api/admin/settings`, integration clients, or Postgres/MinIO wiring exist in `backend/`. Reject any attempt to add them — they violate the spec's explicit Non-goals.

## ui_agent tasks
- [ ] Verify `backend/static/index.html`: `<h1>FaithfulD Book Notes</h1>` and `<title>` both contain literal "FaithfulD"; add-note form has `#title` input, `#body` textarea, and submit; `<ul id="notes">` present; page loads `styles.css` and `js/main.js`.
- [ ] Verify list rendering on load: `GET /api/notes` renders notes newest-first; empty/loading/error states handled gracefully.
- [ ] Verify create flow: form submit → `POST /api/notes` → reload list + clear form inputs.
- [ ] Verify delete flow: Delete sets `?confirmDelete=<id>`, shows inline confirm, `DELETE`s on confirm, clears the param, and reloads; state restored from URL on load (`url-state.js`).
- [ ] Verify XSS safety: all user-supplied text written via `textContent` (no `innerHTML`); endpoints use relative paths (`api/notes`, no leading slash) to support ingress sub-path serving.
- [ ] Guard: confirm NO login/signup/admin-settings screens or nav are added; all app screens remain public per spec Non-goals.

## service_agent tasks
- [ ] Verify the client-side data layer (`backend/static/js/api.js`) wraps the backend contract: list (`GET api/notes`), create (`POST api/notes`), delete (`DELETE api/notes/{id}`) using same-origin relative URLs, with JSON handling and status-code branching (201/204/404/422); errors surface to callers.
- [ ] Verify the JS modules (`main.js`, `note-form.js`, `note-card.js`, `notes-list.js`, `format.js`, `url-state.js`) wire UI to the API client without duplicating fetch logic; confirm `web/src/js/*` (dead scaffolding) is NOT edited or served.

## tester tasks
- [ ] Health: `GET /api/health` → 200 `{"status":"ok"}`; `GET /api/health/deep` → 200 (DB reachable).
- [ ] Create: `POST /api/notes` `{title, body}` → 201 with `id` and `created_at`.
- [ ] List order: create two notes; assert `GET /api/notes` returns the second-created first (`id DESC`).
- [ ] Delete: `DELETE /api/notes/{id}` → 204; subsequent list omits it; unknown id → 404.
- [ ] Validation: empty/whitespace title or body → 422; `title > 200` or `body > 1000` → 422.
- [ ] Persistence: restart the process against the same `DB_PATH` file → previously created notes still returned.
- [ ] UI end-to-end: load `/`, assert "FaithfulD" renders; add a note via form → appears at top; click Delete → `?confirmDelete=<id>` inline confirm → Confirm → note disappears.
- [ ] Regression guard: assert no `/login`, `/signup`, `/admin/*`, or `/api/admin/*` routes respond — out-of-scope surfaces must remain absent.

## Open questions
- **Auth/deployment baseline conflict (resolved in favor of spec).** Pipeline inputs specify `auth_model=full_auth`, `auth_roles=admin,user`, and `spec_deployments=postgresql,minio`. The approved spec's Non-goals **explicitly exclude** auth, user accounts, admin, Postgres, and MinIO, note the existing code already correctly resolved this by omitting them, and record that the user forbids re-scoping. This decomposition follows the spec (the authoritative source of truth for surface area) and omits all auth/admin/settings/Postgres/MinIO tasks. If those surfaces are genuinely intended, the spec must be amended and re-approved before any downstream agent generates them.
- **Integrations input is a placeholder.** `spec_integrations` contains only a synthetic entry ("None — no third-party APIs or SDKs") with a derived env key, and the spec declares no integrations; `placeholder_integrations` is None. No integration client tasks are generated.
- **Production persistence.** `k8s/deployment.yaml` mounts no `/data` PVC, so SQLite lives on ephemeral storage — notes survive app restarts but not pod/container recreation. Acceptable for single-pod staging per spec Risks; attaching a persistent volume at `/data` is a deliberate ops decision (namespace has a hard memory ResourceQuota) and is out of scope for these agents.
- **Optional README.** The spec permits optional, non-behavioral `README.md` run-instruction updates; not assigned as a required task.
