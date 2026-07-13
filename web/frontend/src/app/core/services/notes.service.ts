import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Note, NoteCreate } from '../models/note';

/**
 * Talks to the FaithfulD Book Notes JSON API (FastAPI backend).
 * Endpoints: GET/POST /api/notes, DELETE /api/notes/:id.
 */
@Injectable({ providedIn: 'root' })
export class NotesService {
  private readonly baseUrl = `${environment.apiUrl}/notes`;

  constructor(private http: HttpClient) {}

  /** List notes, newest-first (ordering enforced by the backend). */
  list(): Observable<Note[]> {
    return this.http.get<Note[]>(this.baseUrl);
  }

  /** Create a note; returns the persisted note with id + created_at. */
  create(payload: NoteCreate): Observable<Note> {
    return this.http.post<Note>(this.baseUrl, payload);
  }

  /** Delete a note by id. */
  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
