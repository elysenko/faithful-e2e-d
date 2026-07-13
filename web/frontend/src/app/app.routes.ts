import { Routes } from '@angular/router';
import { FlowRoute } from './flow-meta';

// Single-page book-notes app (no auth — spec non-goal). The landing page IS the
// notes screen. The delete-confirmation is deep-linkable via `?confirmDelete=<id>`
// (see NotesComponent), so every annotatable UI state is reproducible from the URL.
export const routes: Routes = ([
  {
    path: '',
    loadComponent: () =>
      import('./features/notes/notes.component').then((m) => m.NotesComponent),
    data: {
      flow: {
        flowId: 'notes',
        node: 'notes',
        entry: true,
        showInNavbar: true,
        label: 'Book Notes',
        scope: 'all',
      },
    },
  },
  { path: '**', redirectTo: '' },
] satisfies FlowRoute[]) as Routes;
