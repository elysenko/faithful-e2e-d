"use strict";

// Add-note form controller.
//
// Wraps the <form id="note-form">: validates that both fields are non-empty after
// trimming (mirrors the server's rules for instant feedback), surfaces inline
// errors, and delegates the actual create to the controller via onSubmit. On a
// successful submit it clears the form and returns focus to the title field.

/**
 * @param {{
 *   form: HTMLFormElement,
 *   titleInput: HTMLInputElement,
 *   bodyInput: HTMLTextAreaElement,
 *   errorEl: HTMLElement,
 *   onSubmit: (input:{title:string, body:string}) => Promise<void>,
 * }} opts
 */
export function initNoteForm(opts) {
  const { form, titleInput, bodyInput, errorEl, onSubmit } = opts;

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function clearError() {
    errorEl.textContent = "";
    errorEl.hidden = true;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();

    const title = titleInput.value.trim();
    const body = bodyInput.value.trim();
    if (!title || !body) {
      showError("Both a book title and a note are required.");
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    try {
      await onSubmit({ title, body });
      form.reset();
      titleInput.focus();
    } catch (err) {
      showError(err?.message || "Could not add note.");
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  return { showError, clearError };
}
