import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-container">
      <h1>Login</h1>
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
        <div>
          <label for="email">Email</label>
          <input
            id="email"
            type="email"
            formControlName="email"
            autocomplete="email"
            data-testid="login-email"
            placeholder="Enter your email"
          />
          @if (loginForm.get('email')?.invalid && loginForm.get('email')?.touched) {
            <span class="error">Valid email is required</span>
          }
        </div>

        <div>
          <label for="password">Password</label>
          <input
            id="password"
            type="password"
            formControlName="password"
            autocomplete="current-password"
            data-testid="login-password"
            placeholder="Enter your password"
          />
          @if (loginForm.get('password')?.invalid && loginForm.get('password')?.touched) {
            <span class="error">Password is required</span>
          }
        </div>

        @if (errorMessage) {
          <div class="error">{{ errorMessage }}</div>
        }

        <button type="submit" data-testid="login-submit" [disabled]="loginForm.invalid || loading">
          {{ loading ? 'Logging in...' : 'Login' }}
        </button>
      </form>
    </div>
  `,
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.errorMessage = err?.error?.message ?? 'Invalid credentials. Please try again.';
        this.loading = false;
      },
    });
  }
}
