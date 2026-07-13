"use strict";

// Small presentation helpers shared across the UI.

/**
 * Render an ISO-8601 timestamp as a human-readable local date/time.
 * Falls back to the raw string if it does not parse.
 * @param {string} iso
 * @returns {string}
 */
export function formatTimestamp(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Pluralize a count with its unit, e.g. pluralize(1, "note") → "1 note".
 * @param {number} count
 * @param {string} unit
 * @returns {string}
 */
export function pluralize(count, unit) {
  return `${count} ${unit}${count === 1 ? "" : "s"}`;
}
