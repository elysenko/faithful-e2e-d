import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // data-testid="app-ready" is the readiness landmark the post-deploy render gate
  // waits for to confirm the SPA bootstrapped. Keep it on the hydrated root.
  template: '<div data-testid="app-ready"><router-outlet /></div>',
})
export class AppComponent {}
