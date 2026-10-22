import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const isLogin = (url: string) => url.endsWith('/auth/login');

/** Adds the bearer token to every call that targets our own API. */
export const bearerInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).token();
  if (token && req.url.startsWith(environment.apiUrl) && !isLogin(req.url)) {
    req = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
  }
  return next(req);
};

/** Signs the user out on 401 and turns API problem responses into readable toasts. */
export const problemInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toasts = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (isLogin(req.url)) {
        return throwError(() => err);
      }
      if (err.status === 401) {
        auth.logout();
        toasts.error('Your session has expired. Please sign in again.');
      } else if (err.status === 403) {
        toasts.error('Your role is not allowed to perform this action.');
      } else if (err.status === 0) {
        toasts.error('The API is unreachable. Check that the backend is running.');
      } else {
        toasts.error(err.error?.detail ?? 'Something went wrong. Please try again.');
      }
      return throwError(() => err);
    }),
  );
};
