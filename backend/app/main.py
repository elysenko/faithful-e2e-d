"""FaithfulD Book Notes — FastAPI app serving a JSON API and static frontend."""
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Response
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .db import get_conn, init_db
from .models import NoteCreate, NoteOut

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(title="FaithfulD Book Notes", lifespan=lifespan)


# ----- API routes (registered before the catch-all static mount) -----

@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/health/deep")
def health_deep() -> JSONResponse:
    try:
        conn = get_conn()
        try:
            conn.execute("SELECT 1")
        finally:
            conn.close()
    except Exception as exc:  # pragma: no cover - defensive
        return JSONResponse(status_code=500, content={"status": "error", "detail": str(exc)})
    return JSONResponse(status_code=200, content={"status": "ok"})


@app.get("/api/notes", response_model=list[NoteOut])
def list_notes() -> list[NoteOut]:
    conn = get_conn()
    try:
        rows = conn.execute(
            "SELECT id, title, body, created_at FROM notes ORDER BY id DESC"
        ).fetchall()
    finally:
        conn.close()
    return [NoteOut(**dict(r)) for r in rows]


@app.post("/api/notes", response_model=NoteOut, status_code=201)
def create_note(payload: NoteCreate) -> NoteOut:
    created_at = datetime.now(timezone.utc).isoformat()
    conn = get_conn()
    try:
        cur = conn.execute(
            "INSERT INTO notes (title, body, created_at) VALUES (?, ?, ?)",
            (payload.title, payload.body, created_at),
        )
        conn.commit()
        note_id = cur.lastrowid
    finally:
        conn.close()
    return NoteOut(id=note_id, title=payload.title, body=payload.body, created_at=created_at)


@app.delete("/api/notes/{note_id}", status_code=204)
def delete_note(note_id: int) -> Response:
    conn = get_conn()
    try:
        cur = conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))
        conn.commit()
        deleted = cur.rowcount
    finally:
        conn.close()
    if deleted == 0:
        raise HTTPException(status_code=404, detail="note not found")
    return Response(status_code=204)


# Static SPA mounted last so /api/* routes take precedence.
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
