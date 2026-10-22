import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Session } from '../models/api.models';

const STORAGE_KEY = 'nexabank.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly state = signal<Session | null>(this.restore());

  readonly session = this.state.asReadonly();
  readonly isAuthenticated = computed(() => {
    const s = this.state();
    return !!s && new Date(s.expiresAt).getTime() > Date.now();
  });
  readonly isAdmin = computed(() => this.state()?.roles.includes('ADMIN') ?? false);

  login(username: string, password: string): Observable<Session> {
    return this.http
      .post<Session>(`${environment.apiUrl}/auth/login`, { username, password })
      .pipe(tap((session) => this.persist(session)));
  }

  logout(): void {
    this.state.set(null);
    sessionStorage.removeItem(STORAGE_KEY);
    void this.router.navigateByUrl('/login');
  }

  token(): string | null {
    return this.isAuthenticated() ? this.state()!.token : null;
  }

  private persist(session: Session): void {
    this.state.set(session);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  private restore(): Session | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      return null;
    }
  }
}
