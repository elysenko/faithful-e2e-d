"""Pydantic request/response schemas for book notes."""
from pydantic import BaseModel, field_validator


class NoteCreate(BaseModel):
    """Payload for creating a note. Title and body are required and trimmed."""

    title: str
    body: str

    @field_validator("title")
    @classmethod
    def _validate_title(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("title must not be empty")
        if len(v) > 200:
            raise ValueError("title must be at most 200 characters")
        return v

    @field_validator("body")
    @classmethod
    def _validate_body(cls, v: str) -> str:
        v = (v or "").strip()
        if not v:
            raise ValueError("body must not be empty")
        if len(v) > 1000:
            raise ValueError("body must be at most 1000 characters")
        return v


class NoteOut(BaseModel):
    """Serialized note returned by the API."""

    id: int
    title: str
    body: str
    created_at: str
