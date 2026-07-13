"use strict";

// Relative API base so the app works under an ingress sub-path (e.g. /faithful-e2e-d/).
const API = "api/notes";

const form = document.getElementById("note-form");
const titleInput = document.getElementById("title");
const bodyInput = document.getElementById("body");
const notesList = document.getElementById("notes");
const emptyState = document.getElementById("empty-state");
const formError = document.getElementById("form-error");

function showError(msg) {
  formError.textContent = msg;
  formError.hidden = false;
}

function clearError() {
  formError.textContent = "";
  formError.hidden = true;
}

function formatDate(iso) {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleString();
}

// URL-addressable delete confirmation: ?confirmDelete=<id>
function getConfirmDeleteId() {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("confirmDelete");
  if (raw === null) return null;
  const id = parseInt(raw, 10);
  return Number.isInteger(id) ? id : null;
}

function setConfirmDelete(id) {
  const url = new URL(window.location.href);
  if (id === null) {
    url.searchParams.delete("confirmDelete");
  } else {
    url.searchParams.set("confirmDelete", String(id));
  }
  history.replaceState(null, "", url);
}

function renderNote(note) {
  const li = document.createElement("li");
  li.className = "note";
  li.dataset.id = String(note.id);

  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title;

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body;

  const meta = document.createElement("time");
  meta.className = "note-meta";
  meta.dateTime = note.created_at;
  meta.textContent = formatDate(note.created_at);

  const actions = document.createElement("div");
  actions.className = "note-actions";

  if (getConfirmDeleteId() === note.id) {
    const prompt = document.createElement("span");
    prompt.className = "confirm-text";
    prompt.textContent = "Delete this note?";

    const confirmBtn = document.createElement("button");
    confirmBtn.type = "button";
    confirmBtn.className = "danger";
    confirmBtn.textContent = "Confirm delete";
    confirmBtn.setAttribute("data-testid", "confirm-delete");
    confirmBtn.addEventListener("click", () => deleteNote(note.id));

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "secondary";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", () => {
      setConfirmDelete(null);
      loadNotes();
    });

    actions.append(prompt, confirmBtn, cancelBtn);
  } else {
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "secondary";
    deleteBtn.textContent = "Delete";
    deleteBtn.setAttribute("aria-label", `Delete note: ${note.title}`);
    deleteBtn.addEventListener("click", () => {
      setConfirmDelete(note.id);
      loadNotes();
    });
    actions.append(deleteBtn);
  }

  li.append(title, body, meta, actions);
  return li;
}

async function loadNotes() {
  try {
    const res = await fetch(API, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Failed to load notes (${res.status})`);
    const notes = await res.json();

    notesList.textContent = "";
    if (!notes.length) {
      emptyState.hidden = false;
    } else {
      emptyState.hidden = true;
      for (const note of notes) {
        notesList.appendChild(renderNote(note));
      }
    }
  } catch (err) {
    showError(err.message || "Could not load notes.");
  }
}

async function deleteNote(id) {
  try {
    const res = await fetch(`${API}/${id}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Failed to delete note (${res.status})`);
    }
  } catch (err) {
    showError(err.message || "Could not delete note.");
  } finally {
    setConfirmDelete(null);
    loadNotes();
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();

  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  if (!title || !body) {
    showError("Both a book title and a note are required.");
    return;
  }

  try {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body }),
    });
    if (!res.ok) {
      throw new Error(`Failed to add note (${res.status})`);
    }
    form.reset();
    titleInput.focus();
    await loadNotes();
  } catch (err) {
    showError(err.message || "Could not add note.");
  }
});

loadNotes();
