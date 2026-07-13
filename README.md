# FaithfulD Book Notes

A minimal single-container FastAPI + SQLite web app for capturing short notes about books.

## Features
- Landing page titled **FaithfulD Book Notes**
- Add a note (book title + short text)
- Notes listed newest-first
- Delete a note (URL-addressable confirm via `?confirmDelete=<id>`)
- Persistent storage via SQLite

## Frontend
The UI is a zero-framework vanilla HTML/JS/CSS app. Its source lives in `web/src/`
and is compiled into `backend/static/` (served by FastAPI) via a dependency-free
Node build:
```bash
npm ci        # no third-party deps — works offline
npm run build # copies web/src/* -> backend/static/
```
The built assets are committed to `backend/static/` so the Docker image serves them
directly without a Node toolchain at runtime.

## Run locally
```bash
npm run build                                  # refresh backend/static from web/src
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8080
# open http://localhost:8080
```

## Run with Docker
```bash
docker build -t faithfuld .
docker run -p 8080:8080 -v faithfuld-data:/data faithfuld
```

## Configuration
| Env var  | Default                | Purpose                          |
|----------|------------------------|----------------------------------|
| `DB_PATH`| `/data/faithfuld.db`   | SQLite database file location    |
| `PORT`   | `8080`                 | HTTP listen port                 |

## API
- `GET  /api/health` — liveness
- `GET  /api/health/deep` — DB connectivity check
- `GET  /api/notes` — list notes (newest first)
- `POST /api/notes` — create `{ "title", "body" }`
- `DELETE /api/notes/{id}` — delete a note
