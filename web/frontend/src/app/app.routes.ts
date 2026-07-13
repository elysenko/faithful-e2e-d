import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { FlowRoute } from './flow-meta';

// `data.flow` is the single source of truth for the user-flow graph AND the runtime navbar.
// The colossus flow-graph extractor projects it directly (zero heuristics). Authoring rules
// + lint: docs/flow-graph-convention.md + platform/flowgraph-static/verify/flow-lint.mjs.
//
// DEEP-LINKABLE STATE — every navigable UI state a user could leave feedback on must be
// reachable by URL (so automated verification can land on it). Patterns:
//   • wizard / multi-step → child routes, or a `?step=` query param the component restores from:
//       { path: 'onboarding', loadComponent: …, data: { flow: { flowId:'onboarding', node:'onboarding' } }, children: [
//         { path: 'profile', …, data: { flow: { flowId:'onboarding-profile', node:'onboarding-profile' } } },
//         { path: 'connect', …, data: { flow: { flowId:'onboarding-connect', node:'onboarding-connect' } } },
//       ]}
//   • tabs / sub-tabs → child routes (preferred) or `?tab=`
//   • modal / dialog → `?modal=<name>[&id=]` read on init (or a modal child route)
//   • drawer / detail pane → `?panel=<name>&id=` or `/:id`
//   • filtered / sorted list → bind the filter to query params (queryParamsHandling:'merge')
// Never bury a navigable state in component-only state. Transient chrome (tooltip/hover) is exempt.
export const routes: Routes = ([
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    data: { flow: { flowId: 'login', node: 'login', entry: true, edgesTo: ['home'], label: 'Login' } },
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./features/home/home.component').then((m) => m.HomeComponent),
    canActivate: [authGuard],
    data: { flow: { flowId: 'home', node: 'home', showInNavbar: true, label: 'Home', scope: 'all' } },
  },
] satisfies FlowRoute[]) as Routes;
