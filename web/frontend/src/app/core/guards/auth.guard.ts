import { CanActivateFn } from '@angular/router';
import { inject } from '@angular/core';
import { Router } from '@angular/router';

const TOKEN_KEY = 'auth_token';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    return true;
  }

  return router.createUrlTree(['/login']);
};
