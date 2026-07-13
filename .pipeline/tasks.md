# Pipeline Task Decomposition

## Summary
FaithfulD Book Notes is a minimal single-container FastAPI + static-frontend web app that lets users create book notes (title + body), list them newest-first, and delete them via an inline confirmation flow. The API is served from `/api/*` and the vanilla HTML/JS SPA is served from the same origin. Per the pipeline auth model this build additionally layers full authentication (admin + user roles) and an admin settings surface for the provisioned backing services (PostgreSQL, MinIO).

## Surface contract
Routes / screens / entities the system must expose:

- **Public app screens**
  - `/` — landing page titled "FaithfulD Book Notes": add-note form (`#title`, `#body`), notes list (`<ul id="notes">`), inline delete-confirm driven by `?confirmDelete=<id>`.
- **Auth screens (full_auth)**
  - `/login` — user + admin login.
  - `/signup` — user registration (first signup → ADMIN, subsequent → USER).
  - logout action.
- **Admin screens**
  - `/admin` — protected admin route group.
  - `/admin/settings` — service/credential configuration page.
- **API — notes**
  - `GET /api/health` → `{"status":"ok"}`.
  - `GET /api/health/deep` → `SELECT 1` DB check → ok/500.
  - `GET /api/notes` → `list[NoteOut]` ordered `id DESC`.
  - `POST /api/notes` → create from `NoteCreate` → `NoteOut` (201).
  - `DELETE /api/notes/{note_id}` → 204 on success, 404 if absent.
- **API — auth / admin**
  - login / signup / logout endpoints; admin guard middleware on `(admin)` group.
  - `GET /api/admin/settings` — list service keys (masked values + configured status), admin only.
  - `PATCH /api/admin/settings` — upsert key/value pairs, admin only.
- **Entities**
  - `Note` — `id` (int PK), `title` (text, required, ≤200), `body` (text, required, ≤1000), `created_at` (ISO timestamp).
  - `User` — with `role` field (`UserRole` enum).
  - `SystemSetting` — `key` (PK), `value`, `updatedAt`.

## db_agent tasks
- [ ] Create `backend/app/db.py` with `get_conn()` returning a `sqlite3.Connection` (row factory = `sqlite3.Row`) and `init_db()` that reads `DB_PATH`, ensures the parent dir exists, and runs `CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`.
- [ ] Define the `notes` schema exactly per spec: `id`, `title`, `body`, `created_at`; ensure newest-first ordering is supported via `id DESC`.
- [ ] Add a `User` model/table with a `role` field using `enum UserRole { ADMIN USER }` and `role @default(USER)` (full_auth). First signup becomes ADMIN, subsequent users USER (enforced in backend).
- [ ] Add a `SystemSetting` model/table — `key String @id`, `value String`, `updatedAt DateTime @updatedAt` — to back admin settings for the provisioned services.
- [ ] Provide schema bootstrap for all tables on startup (create-if-missing) consistent with the SQLite/no-ORM approach in the spec.

## backend_agent tasks
- [ ] Create `backend/app/main.py`: instantiate `FastAPI()`, call `init_db()` on startup, and mount `StaticFiles(directory="backend/static", html=True)` at `/` last so `/api/*` routes resolve first.
- [ ] Implement `GET /api/health` → `{"status":"ok"}` and `GET /api/health/deep` → runs `SELECT 1`, returns ok or 500.
- [ ] Implement `GET /api/notes` → select all notes `ORDER BY id DESC`, return `list[NoteOut]`.
- [ ] Implement `POST /api/notes` → validate `NoteCreate`, set `created_at` to UTC ISO now, insert, return created `NoteOut` with 201.
- [ ] Implement `DELETE /api/notes/{note_id}` → delete row, 204 on success, 404 if row absent.
- [ ] Create `backend/app/models.py` with `NoteCreate(title, body)` (trimmed, non-empty, title ≤200, body ≤1000; invalid → 422) and `NoteOut(id, title, body, created_at)`.
- [ ] Add auth flows (full_auth): login, signup, logout endpoints; first signup gets `ADMIN` role, subsequent users get `USER`; protect all non-public app routes.
- [ ] Add admin guard middleware and the protected `(admin)` route group; admin access via role check in the `(admin)` layout.
- [ ] Create `lib/config.ts`-equivalent `resolveConfig(key)` helper: read `process.env[key]` first; if value equals `PLACEHOLDER_CONFIGURE_IN_SETTINGS` or is absent, read from the `SystemSetting` row; return null if neither is set.
- [ ] Implement `GET /api/admin/settings` (list service keys for `postgresql` and `minio` with masked values + configured status) and `PATCH /api/admin/settings` (upsert key/value pairs, admin role required).
- [ ] Create `Dockerfile` (`python:3.12-slim`, install `requirements.txt`, copy `backend/`, `ENV DB_PATH=/data/faithfuld.db PORT=8080`, `EXPOSE 8080`, `CMD` running uvicorn on `0.0.0.0:${PORT}`) and `.dockerignore` (`.git`, `__pycache__`, `*.db`); add `backend/requirements.txt` with `fastapi`, `uvicorn[standard]`, `pydantic`.

## ui_agent tasks
- [ ] Create `backend/static/index.html`: `<h1>FaithfulD Book Notes</h1>`, add-note form with `#title` input + `#body` textarea + submit button, `<ul id="notes">` container; link `styles.css` and `app.js`.
- [ ] Create `backend/static/app.js`: on load call `loadNotes()` (`GET /api/notes`) and render each note (title, body, timestamp, Delete button) newest-first, escaping user text via `textContent`.
- [ ] In `app.js`, wire form submit → `POST /api/notes`, then reload list and clear form; render empty/loading/error states for the notes list.
- [ ] In `app.js`, implement delete flow: Delete button sets `?confirmDelete=<id>`; on load if present show inline confirm → on confirm `DELETE /api/notes/{id}`, then clear the param and reload.
- [ ] Create `backend/static/styles.css`: minimal readable layout — centered container, form spacing, note cards.
- [ ] Add `/login` and `/signup` screens as part of the main app (full_auth); show the admin section in navigation only to admins.
- [ ] Create the `/admin/settings` page: list `postgresql` and `minio` each with a configured/unconfigured badge and a per-service credential form bound to `GET`/`PATCH /api/admin/settings`.

## service_agent tasks
- [ ] Build the client-side data layer in `app.js` for notes: helper functions wrapping `GET /api/notes`, `POST /api/notes`, and `DELETE /api/notes/{id}` (same-origin fetch, JSON handling, status-code branching for 201/204/404/422).
- [ ] Wire the auth screens to the backend auth endpoints (login/signup/logout) and handle session/redirect state.
- [ ] Wire the `/admin/settings` UI to `GET /api/admin/settings` (load masked values + configured status) and `PATCH /api/admin/settings` (submit credential updates).

## tester tasks
- [ ] Health: `GET /api/health` → 200 ok; `GET /api/health/deep` → 200 with DB reachable.
- [ ] Create: `POST /api/notes` with title+body → 201 and returned object has `id` + `created_at`.
- [ ] List order: create two notes; `GET /api/notes` returns the second one first (`id DESC`).
- [ ] Persist: restart container against same volume → notes still returned.
- [ ] Delete: `DELETE /api/notes/{id}` → 204; subsequent GET omits it; deleting unknown id → 404.
- [ ] Validation: empty/whitespace title or body → 422; over-length title (>200) / body (>1000) rejected.
- [ ] UI happy path: load `/`, confirm "FaithfulD Book Notes" renders in `<h1>`; add a note via form → appears at top; delete via button + `?confirmDelete=<id>` confirm → disappears.
- [ ] Auth: signup (first user → ADMIN, second → USER), login, logout; non-public routes reject unauthenticated access; `/admin` and `/admin/settings` reject non-admins.
- [ ] Admin settings: `GET /api/admin/settings` lists `postgresql` + `minio` with masked values/configured status; `PATCH` upserts and persists; both require admin role.

## Open questions
- **Auth conflict:** The spec explicitly lists "No auth, no user accounts" as a non-goal, but the pipeline `<auth_model>` is `full_auth` (roles: admin, user). Per pipeline rules the full_auth surface (User model, login/signup, admin guard) has been included. Confirm whether auth should truly be layered onto this app or whether the spec's no-auth intent overrides it.
- **Backing-services conflict:** The spec's stack is FastAPI + local `sqlite3` at `DB_PATH`, but `<spec_deployments>` provisions `postgresql` and `minio`. Admin-settings tasks for these services were added per pipeline rules. Confirm whether the app should actually use PostgreSQL/MinIO (e.g. DB migration, object storage for note attachments) or whether SQLite remains authoritative and the settings page merely surfaces provisioned credentials.
- **Framework mismatch for config helper:** Admin-settings rules reference `lib/config.ts` / `process.env` (Node/TS conventions), but the app is Python/FastAPI. The `resolveConfig` helper has been described as a Python-equivalent module (`backend/app/config.py`); confirm the intended language/placement.
- **Integrations:** `<spec_integrations>` contains only a placeholder entry ("None — no third-party APIs or SDKs") with no real env keys, and `<placeholder_integrations>` is None, so no integration client modules were created. Confirm there are genuinely no third-party integrations.
