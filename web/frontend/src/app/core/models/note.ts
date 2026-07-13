/** A book note as returned by the backend API. */
export interface Note {
  id: number;
  title: string;
  body: string;
  created_at: string;
}

/** Payload for creating a note. */
export interface NoteCreate {
  title: string;
  body: string;
}
