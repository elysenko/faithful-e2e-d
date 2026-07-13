"use strict";

// URL-addressable delete-confirmation state.
//
// The only non-trivial UI state in the app — "which note is pending a delete
// confirmation" — is stored in the query string (?confirmDelete=<id>) rather than
// in a JS variable, so the state is deep-linkable and survives a refresh. On load
// the app reads this param to restore the inline confirm prompt for that note.

const PARAM = "confirmDelete";

/**
 * @returns {number|null} the note id pending confirmation, or null if none / invalid.
 */
export function getConfirmDeleteId() {
  const raw = new URLSearchParams(window.location.search).get(PARAM);
  if (raw === null) return null;
  const id = Number.parseInt(raw, 10);
  return Number.isInteger(id) && String(id) === raw ? id : null;
}

/** Write ?confirmDelete=<id> into the URL without adding a history entry. */
export function setConfirmDeleteId(id) {
  const url = new URL(window.location.href);
  url.searchParams.set(PARAM, String(id));
  window.history.replaceState(null, "", url);
}

/** Remove the confirmDelete param from the URL. */
export function clearConfirmDeleteId() {
  const url = new URL(window.location.href);
  url.searchParams.delete(PARAM);
  window.history.replaceState(null, "", url);
}
