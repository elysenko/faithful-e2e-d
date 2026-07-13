"""SQLite connection helper and schema bootstrap for FaithfulD Book Notes."""
import os
import sqlite3
from pathlib import Path

# Default to a local file for dev; production sets DB_PATH to a persistent volume.
DEFAULT_DB_PATH = "./faithfuld.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def get_db_path() -> str:
    """Resolve the SQLite database path from the DB_PATH env var."""
    return os.environ.get("DB_PATH", DEFAULT_DB_PATH)


def get_conn() -> sqlite3.Connection:
    """Open a new SQLite connection with a row factory for dict-like access."""
    conn = sqlite3.connect(get_db_path())
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    """Ensure the parent directory and the notes table exist."""
    db_path = get_db_path()
    parent = Path(db_path).expanduser().resolve().parent
    parent.mkdir(parents=True, exist_ok=True)
    conn = get_conn()
    try:
        conn.executescript(_SCHEMA)
        conn.commit()
    finally:
        conn.close()
