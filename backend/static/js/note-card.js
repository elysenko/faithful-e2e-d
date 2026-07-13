"use strict";

// Note card "component".
//
// Builds the DOM for a single note as an <li>. All user-supplied text is written
// with `textContent` (never innerHTML) so titles/bodies like `<b>x</b>` render as
// literal text and cannot inject markup. When the note id matches the pending
// delete-confirmation id, the card renders an inline confirm/cancel prompt
// instead of the plain Delete button.

import { formatTimestamp } from "./format.js";

/**
 * @param {{id:number,title:string,body:string,created_at:string}} note
 * @param {{
 *   pendingDelete: boolean,
 *   onRequestDelete: (id:number)=>void,
 *   onConfirmDelete: (id:number)=>void,
 *   onCancelDelete: (id:number)=>void,
 * }} handlers
 * @returns {HTMLLIElement}
 */
export function createNoteCard(note, handlers) {
  const li = document.createElement("li");
  li.className = "note";
  li.dataset.id = String(note.id);
  li.dataset.testid = "note";

  const title = document.createElement("h3");
  title.className = "note-title";
  title.textContent = note.title;

  const body = document.createElement("p");
  body.className = "note-body";
  body.textContent = note.body;

  const meta = document.createElement("time");
  meta.className = "note-meta";
  meta.dateTime = note.created_at;
  meta.textContent = formatTimestamp(note.created_at);

  const actions = document.createElement("div");
  actions.className = "note-actions";
  actions.append(
    handlers.pendingDelete
      ? buildConfirm(note, handlers)
      : buildDeleteButton(note, handlers),
  );

  li.append(title, body, meta, actions);
  return li;
}

function buildDeleteButton(note, handlers) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "secondary";
  btn.textContent = "Delete";
  btn.dataset.testid = "delete-note";
  btn.setAttribute("aria-label", `Delete note: ${note.title}`);
  btn.addEventListener("click", () => handlers.onRequestDelete(note.id));
  return btn;
}

function buildConfirm(note, handlers) {
  const wrap = document.createElement("div");
  wrap.className = "confirm";
  wrap.setAttribute("role", "group");
  wrap.setAttribute("aria-label", `Confirm deleting note: ${note.title}`);

  const prompt = document.createElement("span");
  prompt.className = "confirm-text";
  prompt.textContent = "Delete this note?";

  const confirmBtn = document.createElement("button");
  confirmBtn.type = "button";
  confirmBtn.className = "danger";
  confirmBtn.textContent = "Confirm delete";
  confirmBtn.dataset.testid = "confirm-delete";
  confirmBtn.addEventListener("click", () => handlers.onConfirmDelete(note.id));

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "secondary";
  cancelBtn.textContent = "Cancel";
  cancelBtn.dataset.testid = "cancel-delete";
  cancelBtn.addEventListener("click", () => handlers.onCancelDelete(note.id));

  wrap.append(prompt, confirmBtn, cancelBtn);
  return wrap;
}
