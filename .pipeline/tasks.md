# Pipeline Task Decomposition

## Summary
FaithfulD Book Notes is a single-page book-notes app (FastAPI + stdlib `sqlite3` + a vanilla-JS ES-module static frontend served by FastAPI). Users add short notes (title + body), see them newest-first, and delete them via a URL-addressable confirm flow (`?confirmDelete=<id>`). The application is GREENFIELD but already fully implemented and, per the spec, already satisfies every requirement. This pipeline run is therefore **verification, consistency, and pruning of stale out-of-scope artifacts — not new feature code**. No auth, no accounts, no admin, no Postgres/MinIO, no third-party integrations are in scope; the spec's `## Non-goals` and `## Assumptions` explicitly exclude them and the existing code correctly contains none.

## Surface contract
Source of truth for ui_agent + service_agent + tester. Nothing here is to be created — it is to be *verified present and correct*.

**HTTP API (backend, all under relative base — app is served at ingress sub-path `/faithful-e2e-d/`):**
- `GET /api/health` → 200 `{"status":"ok"}` (public, exempt).
- `GET /api/health/deep` → 200 (public, exempt).
- `GET /api/notes` → list of notes ordered `id DESC` (newest-first).
- `POST /api/notes` `{title, body}` → 201 with `id` + `created_at` (UTC ISO). Validation: title trimmed, non-empty, ≤200; body trimmed, non-empty, ≤1000; violations → 422.
- `DELETE /api/notes/{note_id}` → 204 on success; 404 for unknown id.
- Static mount at `/` registered **last** so `/api/*` routes win.

**Frontend (single page at `/`):**
- `<main data-testid="app-ready">` wrapper.
- `<h1>FaithfulD Book Notes</h1>` (literal "FaithfulD" required).
- Subtitle: "Capture short notes about the books you read."
- Add-note form: `#title`, `#body`, submit button → `POST /api/notes`.
- `<ul id="notes">` note list, newest-first.
- Loading / empty / error states; note cards render via `textContent` (XSS-safe).
- Delete → inline confirm addressed by query string `?confirmDelete=<id>`, deep-linkable/restorable on reload.
- Relative asset + API paths only (`styles.css`, `js/main.js`, `api/notes` — no leading slash).

**Entities:**
- `Note` — `id` (autoincrement PK, doubles as the newest-first ordering key), `title` (str ≤200), `body` (str ≤1000), `created_at` (UTC ISO string).
- No `User`, no `SystemSetting`, no role/enum tables (explicitly out of scope — see Open questions).

## db_agent tasks
- [ ] Verify (no edits expected) the SQLite schema in `backend/app/db.py`: single `notes` table with `id` (INTEGER PK AUTOINCREMENT), `title`, `body`, `created_at`; `init_db()` creates it idempotently (create-if-missing).
- [ ] Confirm `DB_PATH` defaults to `/data/faithfuld.db` and that `init_db()` is invoked from the FastAPI lifespan on startup.
- [ ] Confirm newest-first is backed by `ORDER BY id DESC` (monotonic autoincrement) — no schema change; document that `id DESC` is the intended, timestamp-collision-robust proxy for `created_at DESC`.
- [ ] Confirm NO `User`, `UserRole`, or `SystemSetting` tables/enums exist and none are added — the spec's Non-goals forbid them (see Open questions re: overridden `full_auth` + Postgres/MinIO directives).

## backend_agent tasks
- [ ] Verify `backend/app/main.py` (no edits expected): lifespan calls `init_db()`; `GET /api/health` → 200 `{"status":"ok"}` and `GET /api/health/deep` → 200, both public/exempt.
- [ ] Verify `GET /api/notes` returns rows ordered `id DESC`.
- [ ] Verify `POST /api/notes` sets UTC ISO `created_at`, returns 201 with `id` + `created_at`.
- [ ] Verify `DELETE /api/notes/{note_id}` returns 204 on success and 404 for unknown id.
- [ ] Verify `NoteCreate` (in `backend/app/models.py`) trims and validates: title non-empty ≤200, body non-empty ≤1000; empty/whitespace or over-length → 422.
- [ ] Verify the static files mount at `/` is registered **last** so `/api/*` routes take precedence.
- [ ] Confirm NO auth/admin code exists or is added: no `/login`, `/signup`, `/admin`, no route guards, no admin middleware, no `/api/admin/settings`, no `lib/config.ts`/`resolveConfig` helper — all out of scope per spec (see Open questions).
- [ ] Confirm NO integration client modules are created — spec confirms "None — no third-party APIs" (see Open questions re: the placeholder `spec_integrations` entry).
- [ ] Confirm `backend/requirements.txt` is unchanged (`fastapi==0.111.0`, `uvicorn[standard]==0.30.1`, `pydantic==2.7.4`) — no new dependencies.

## ui_agent tasks
- [ ] Verify `backend/static/index.html` (no edits expected): `<main data-testid="app-ready">`, `<h1>FaithfulD Book Notes</h1>`, subtitle "Capture short notes about the books you read.", form with `#title`/`#body`/submit, `<ul id="notes">`.
- [ ] Verify `backend/static/js/*.js` behaviours: `note-form.js` posts to `POST /api/notes`; loading, empty, and error states render; `note-card.js` uses `textContent` (no `innerHTML`, XSS-safe).
- [ ] Verify delete-confirm UI is driven by `?confirmDelete=<id>` and is restored on reload when that param is present.
- [ ] Verify all asset/API paths are relative (`styles.css`, `js/main.js`, `api/notes`) so the app works under the `/faithful-e2e-d/` sub-path; keep them relative (do not add leading slashes).
- [ ] Confirm the page never renders forbidden signatures in steady state ("Loading...", "Failed to load", placeholder text) per acceptance `reject_signatures`.
- [ ] Confirm NO `/login`, `/signup`, `/admin`, or `/admin/settings` screens exist or are added — out of scope per spec (see Open questions).

## service_agent tasks
- [ ] Verify `backend/static/js/api.js` uses relative path `"api/notes"` (no leading slash) for GET/POST/DELETE and correctly maps responses/status codes to the UI.
- [ ] Verify the client data layer handles 201 (create), 204 (delete), 404 (unknown id on delete), and 422 (validation) responses gracefully.
- [ ] **Deployed-asset parity:** verify `backend/static/*` is byte-for-byte identical to `web/src/*` (same 8 files). `npm run build` deletes `backend/static/` then re-copies `web/src/`, so divergence would silently regress the deployed frontend. If they differ, reconcile so the two are in sync (deployed copy is canonical) and re-verify.

## tester tasks
- [ ] Health: `GET /api/health` → 200 `{"status":"ok"}`; `GET /api/health/deep` → 200.
- [ ] Create: `POST /api/notes {title, body}` → 201 with `id` + `created_at`.
- [ ] Order: create two notes → `GET /api/notes` returns the newer first (`id DESC`).
- [ ] Persist: restart the process against the same `DB_PATH` file → previously created notes still returned.
- [ ] Delete: `DELETE /api/notes/{id}` → 204; subsequent `GET /api/notes` omits it; unknown id → 404.
- [ ] Validation: empty/whitespace title or body → 422; title >200 or body >1000 → 422.
- [ ] UI happy path: load `/`, assert "FaithfulD Book Notes" and "capture short notes about the books" render; add a note via the form → appears at top; click Delete → `?confirmDelete=<id>` inline confirm → Confirm → note disappears; reload with the param → confirm prompt restored.
- [ ] No forbidden signatures: page never shows "Loading..."/"Failed to load"/placeholder text (acceptance `reject_signatures`).
- [ ] Sub-path: load under `/faithful-e2e-d/` and confirm assets + `api/notes` resolve relatively.
- [ ] Deployment chain (verify, no edits): `Dockerfile` `COPY backend/ ./backend/` includes `backend/static/`, sets `DB_PATH=/data/faithfuld.db` + `PORT=8080`, runs `uvicorn backend.app.main:app` on `0.0.0.0:${PORT}`.

## Open questions
- **Auth-model conflict (resolved in favor of the spec):** the pipeline `auth_model` input is `full_auth` (roles `admin, user`), which would normally require `User`/`UserRole` tables, login/signup screens, admin guards, and an `/admin` route group. The spec **explicitly overrides this** — its `## Non-goals` states "No auth, no user accounts," its Assumptions section names the `full_auth` directive as "stale," and the user instruction is to treat the spec as authoritative and not re-scope. Therefore NO auth/admin surface is included above and downstream agents must NOT build it. Flagged so the override is visibly intentional, not an oversight.
- **Deployment-services conflict (resolved in favor of the spec):** `spec_deployments` lists `postgresql` and `minio`, which would normally trigger `SystemSetting` + `resolveConfig`/`lib/config.ts` + `/admin/settings` tasks. The spec declares SQLite authoritative and ignores the provisioned Postgres/MinIO. No settings/config tasks are included. Confirm the operator is OK leaving the Postgres/MinIO provisioning unused for this app.
- **Integrations conflict (resolved in favor of the spec):** `spec_integrations` contains a single placeholder entry whose name is literally the sentence "None. No third-party APIs or SDKs…". The spec confirms "None — no third-party APIs." Treated as no integrations; no integration client modules are created.
- **SQLite persistence in-cluster:** `k8s/deployment.yaml` mounts no PVC, so `/data/faithfuld.db` is ephemeral — notes are lost on pod restart in-cluster (local Docker with a named volume persists). Spec requires DB persistence but flags this as acceptable for staging E2E. If cluster-level durability is required, add a PVC + volumeMount at `/data`. Needs an operator decision.
- **Stale prior `tasks.md`:** the previous content of this file encoded auth/admin/Postgres/MinIO/integration work that directly contradicts the spec. It has been replaced by this decomposition; that stale work must not be actioned.
