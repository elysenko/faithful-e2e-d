import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NotesService } from '../../core/services/notes.service';
import { Note } from '../../core/models/note';

@Component({
  selector: 'app-notes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notes.component.html',
})
export class NotesComponent implements OnInit {
  notes: Note[] = [];
  loading = true;
  loadError = '';

  title = '';
  body = '';
  submitting = false;
  formError = '';

  /** Id of the note whose inline delete-confirm is open (mirrors ?confirmDelete=). */
  confirmDeleteId: number | null = null;

  constructor(
    private notesService: NotesService,
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
    this.loadNotes();
  }

  loadNotes(): void {
    this.loading = true;
    this.loadError = '';
    this.notesService.list().subscribe({
      next: (notes) => {
        this.notes = notes;
        this.loading = false;
      },
      error: () => {
        this.loadError = 'Could not load your notes. Please try again.';
        this.loading = false;
      },
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
    this.notesService.create({ title, body }).subscribe({
      next: (created) => {
        // Newest-first: prepend so the new note appears at the top immediately.
        this.notes = [created, ...this.notes];
        this.title = '';
        this.body = '';
        this.submitting = false;
      },
      error: () => {
        this.formError = 'Could not save your note. Please try again.';
        this.submitting = false;
      },
    });
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
    this.notesService.remove(id).subscribe({
      next: () => {
        this.notes = this.notes.filter((n) => n.id !== id);
        this.cancelDelete();
      },
      error: () => {
        this.loadError = 'Could not delete that note. Please try again.';
      },
    });
  }

  formatDate(iso: string): string {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
  }

  trackById(_index: number, note: Note): number {
    return note.id;
  }
}
