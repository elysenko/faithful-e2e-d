# Architecture

## Project: FaithfulD Book Notes

## Platforms requested
- `backend` — newly scaffolded (NestJS template as placeholder; coder replaces with FastAPI)
- `web` — newly scaffolded (Angular template as placeholder; not used — frontend is vanilla HTML/JS inside `backend/static/`)

## Directory layout
```
.
├── backend/           # FastAPI app (Python 3.12 + SQLite)
│   ├── app/
│   │   ├── main.py   # FastAPI app, startup, routes, static mount
│   │   ├── db.py     # SQLite connection + schema bootstrap
│   │   └── models.py # Pydantic schemas (NoteCreate, NoteOut)
│   ├── static/
│   │   ├── index.html
│   │   ├── app.js
│   │   └── styles.css
│   └── requirements.txt
├── web/               # Angular template (scaffolded; not used by this project)
├── Dockerfile         # Single-container build: python:3.12-slim, uvicorn on :8080
└── .dockerignore
```

## Template sources
- `backend/` → `/app/scaffold-templates/template-backend/` (NestJS — to be replaced)
- `web/` → `/app/scaffold-templates/template-web/` (Angular — not used)

## Next steps for the developer
1. The coder agent will implement FastAPI files; the NestJS template in `backend/` will be replaced.
2. After implementation: `pip install -r backend/requirements.txt` then `uvicorn backend.app.main:app --reload`
3. For persistent storage in production: mount a volume at `/data` (SQLite DB stored at `/data/faithfuld.db`)
4. To build the container: `docker build -t faithfuld .`
5. To run locally with persistence: `docker run -p 8080:8080 -v faithfuld-data:/data faithfuld`

## Stack summary
| Layer      | Technology                  |
|------------|-----------------------------|
| API        | FastAPI (Python 3.12)       |
| DB         | SQLite (stdlib sqlite3)     |
| Frontend   | Vanilla HTML/JS/CSS         |
| Container  | python:3.12-slim            |
| Port       | 8080 (env `PORT`)           |
| DB path    | `/data/faithfuld.db` (env `DB_PATH`) |
