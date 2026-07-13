import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Note } from '../../core/models/note';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.component.html',
})
export class NotesComponent implements OnInit {
  // DATA CONTRACT: everything the backend will provide is a signal<Note[]>([...mock...]).
  // The mockup_cleaner stage clears this to signal<Note[]>([]) and the service_agent
  // stage wires it to NotesService (GET/POST/DELETE api/notes) via ngOnInit(). The mock
  // rows below make the mockup render real content without a live backend.
  notes = signal<Note[]>([
    {
      id: 3,
      title: 'The Pragmatic Programmer',
      body: 'Great reminder to keep code DRY and to fix broken windows early before they multiply into technical debt.',
      created_at: '2026-07-13T09:42:00Z',
    },
    {
      id: 2,
      title: 'Deep Work',
      body: 'Batching shallow tasks and protecting long uninterrupted focus blocks is the single highest-leverage habit for real output.',
      created_at: '2026-07-12T18:15:00Z',
    },
    {
      id: 1,
      title: 'Thinking, Fast and Slow',
      body: 'System 1 vs System 2 framing keeps showing up — worth re-reading the chapters on anchoring bias.',
      created_at: '2026-07-11T20:05:00Z',
    },
  ]);

  loading = false;
  loadError = '';

  title = '';
  body = '';
  submitting = false;
  formError = '';

  /** Id of the note whose inline delete-confirm is open (mirrors ?confirmDelete=). */
  confirmDeleteId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    // Delete-confirm state is URL-addressable so it is deep-linkable / verifiable.
    this.route.queryParamMap.subscribe((params) => {
      const raw = params.get('confirmDelete');
      const id = raw ? Number(raw) : NaN;
      this.confirmDeleteId = Number.isInteger(id) ? id : null;
    });
  }

  addNote(): void {
    const title = this.title.trim();
    const body = this.body.trim();
    this.formError = '';
    if (!title || !body) {
      this.formError = 'Both a book title and a note are required.';
      return;
    }
    this.submitting = true;
    // Mockup: create in-memory (newest-first). service_agent replaces this with a POST.
    const nextId = this.notes().reduce((max, n) => Math.max(max, n.id), 0) + 1;
    const created: Note = {
      id: nextId,
      title,
      body,
      created_at: new Date().toISOString(),
    };
    this.notes.update((current) => [created, ...current]);
    this.title = '';
    this.body = '';
    this.submitting = false;
  }

  /** Open the inline confirm for a note by writing ?confirmDelete=<id> to the URL. */
  askDelete(id: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { confirmDelete: id },
      queryParamsHandling: 'merge',
    });
  }

  /** Close the inline confirm by clearing the query param. */
  cancelDelete(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { confirmDelete: null },
      queryParamsHandling: 'merge',
    });
  }

  confirmDelete(id: number): void {
    // Mockup: delete in-memory. service_agent replaces this with a DELETE request.
    this.notes.update((current) => current.filter((n) => n.id !== id));
    this.cancelDelete();
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  trackById(_index: number, note: Note): number {
    return note.id;
  }
}
