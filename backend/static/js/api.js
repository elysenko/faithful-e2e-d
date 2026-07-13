"use strict";

// Notes data layer.
//
// Same-origin fetch client for the /api/notes resource. The endpoint is written
// WITHOUT a leading slash so every request is relative to the document base and
// keeps working when the app is served under an ingress sub-path
// (e.g. /faithful-e2e-d/). All status-code branching for the notes API lives here
// so the UI layer never touches fetch() directly.

const NOTES_ENDPOINT = "api/notes";

/** Error carrying the HTTP status so callers can branch on it. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function readJson(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * GET /api/notes → NoteOut[] ordered newest-first (id DESC).
 * @returns {Promise<Array<{id:number,title:string,body:string,created_at:string}>>}
 */
export async function fetchNotes() {
  const res = await fetch(NOTES_ENDPOINT, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new ApiError(`Could not load notes (${res.status}).`, res.status);
  }
  const data = await readJson(res);
  return Array.isArray(data) ? data : [];
}

/**
 * POST /api/notes → created NoteOut (201).
 * @param {{title:string, body:string}} input
 */
export async function createNote(input) {
  const res = await fetch(NOTES_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(input),
  });
  if (res.status === 422) {
    throw new ApiError("Please enter a valid book title and note.", 422);
  }
  if (!res.ok) {
    throw new ApiError(`Could not add note (${res.status}).`, res.status);
  }
  return readJson(res);
}

/**
 * DELETE /api/notes/{id} → 204. A 404 is treated as already-deleted so the UI
 * stays idempotent (the row is gone either way).
 * @param {number} id
 * @returns {Promise<number>} the HTTP status
 */
export async function deleteNote(id) {
  const res = await fetch(`${NOTES_ENDPOINT}/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 404) {
    throw new ApiError(`Could not delete note (${res.status}).`, res.status);
  }
  return res.status;
}
