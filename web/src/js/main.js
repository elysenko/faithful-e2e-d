"use strict";

// Application entry point / controller.
//
// Wires the data layer (api.js), the URL-addressable delete state (url-state.js),
// the notes list view (notes-list.js), the note cards (note-card.js) and the
// add-note form (note-form.js) into a working single-page experience:
//   • load notes newest-first on startup and after every mutation,
//   • add a note via the form,
//   • delete a note through an inline, URL-addressable confirmation
//     (?confirmDelete=<id>) that is restored on refresh / deep-link.

import { fetchNotes, createNote, deleteNote } from "./api.js";
import {
  getConfirmDeleteId,
  setConfirmDeleteId,
  clearConfirmDeleteId,
} from "./url-state.js";
import { createNotesView } from "./notes-list.js";
import { initNoteForm } from "./note-form.js";

function byId(id) {
  return document.getElementById(id);
}

function bootstrap() {
  const els = {
    form: byId("note-form"),
    titleInput: byId("title"),
    bodyInput: byId("body"),
    formError: byId("form-error"),
    list: byId("notes"),
    loading: byId("notes-loading"),
    error: byId("notes-error"),
    empty: byId("empty-state"),
    count: byId("notes-count"),
  };

  const view = createNotesView({
    list: els.list,
    loading: els.loading,
    error: els.error,
    empty: els.empty,
    count: els.count,
  });

  const form = initNoteForm({
    form: els.form,
    titleInput: els.titleInput,
    bodyInput: els.bodyInput,
    errorEl: els.formError,
    onSubmit: async (input) => {
      await createNote(input);
      // A brand-new note is never mid-confirmation; drop any stale param.
      clearConfirmDeleteId();
      await loadNotes();
    },
  });

  const handlers = {
    get pendingDeleteId() {
      return getConfirmDeleteId();
    },
    onRequestDelete(id) {
      setConfirmDeleteId(id);
      loadNotes();
    },
    onCancelDelete() {
      clearConfirmDeleteId();
      loadNotes();
    },
    async onConfirmDelete(id) {
      try {
        await deleteNote(id);
      } catch (err) {
        form.showError(err?.message || "Could not delete note.");
      } finally {
        clearConfirmDeleteId();
        await loadNotes();
      }
    },
  };

  async function loadNotes() {
    view.showLoading();
    try {
      const notes = await fetchNotes();
      view.render(notes, handlers);
    } catch (err) {
      view.showError(err?.message || "Could not load notes.");
    }
  }

  // Restore the delete-confirm prompt if the page was opened with ?confirmDelete=<id>.
  loadNotes();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap);
} else {
  bootstrap();
}
