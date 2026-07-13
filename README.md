# FaithfulD Book Notes

A minimal single-container FastAPI + SQLite web app for capturing short notes about books.

## Features
- Landing page titled **FaithfulD Book Notes**
- Add a note (book title + short text)
- Notes listed newest-first
- Delete a note (URL-addressable confirm via `?confirmDelete=<id>`)
- Persistent storage via SQLite

## Run locally
```bash
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
