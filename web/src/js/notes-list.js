"use strict";

// Notes list view.
//
// Owns the <ul id="notes"> container plus its loading / empty / error / count
// chrome, and renders the current set of notes as note cards. Presentation only —
// all data fetching and state transitions are driven by the controller (main.js).

import { createNoteCard } from "./note-card.js";
import { pluralize } from "./format.js";

/**
 * @param {{
 *   list: HTMLElement, loading: HTMLElement, error: HTMLElement,
 *   empty: HTMLElement, count: HTMLElement,
 * }} els
 */
export function createNotesView(els) {
  function hideStatuses() {
    els.loading.hidden = true;
    els.error.hidden = true;
    els.empty.hidden = true;
  }

  function setCount(n) {
    if (n > 0) {
      els.count.textContent = pluralize(n, "note");
      els.count.hidden = false;
    } else {
      els.count.textContent = "";
      els.count.hidden = true;
    }
  }

  return {
    showLoading() {
      hideStatuses();
      els.loading.hidden = false;
    },

    showError(message) {
      hideStatuses();
      els.list.replaceChildren();
      setCount(0);
      els.error.textContent = message;
      els.error.hidden = false;
    },

    /**
     * @param {Array} notes
     * @param {import("./note-card.js")} handlers passed through to each card
     */
    render(notes, handlers) {
      hideStatuses();
      setCount(notes.length);

      if (!notes.length) {
        els.list.replaceChildren();
        els.empty.hidden = false;
        return;
      }

      const pendingId = handlers.pendingDeleteId;
      const cards = notes.map((note) =>
        createNoteCard(note, {
          pendingDelete: note.id === pendingId,
          onRequestDelete: handlers.onRequestDelete,
          onConfirmDelete: handlers.onConfirmDelete,
          onCancelDelete: handlers.onCancelDelete,
        }),
      );
      els.list.replaceChildren(...cards);
    },
  };
}
