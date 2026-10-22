import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  it('starts signed out', () => {
    expect(TestBed.inject(AuthService).isAuthenticated()).toBeFalse();
  });

  it('stores the session after a successful login and exposes the role', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('admin', 'secret').subscribe();
    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({
      token: 't', expiresAt: new Date(Date.now() + 60_000).toISOString(), username: 'admin', roles: ['ADMIN'],
    });
    expect(auth.isAuthenticated()).toBeTrue();
    expect(auth.isAdmin()).toBeTrue();
    expect(auth.token()).toBe('t');
  });

  it('treats an expired token as signed out', () => {
    const auth = TestBed.inject(AuthService);
    auth.login('teller', 'x').subscribe();
    http.expectOne((r) => r.url.endsWith('/auth/login')).flush({
      token: 't', expiresAt: new Date(Date.now() - 1000).toISOString(), username: 'teller', roles: ['TELLER'],
    });
    expect(auth.isAuthenticated()).toBeFalse();
    expect(auth.token()).toBeNull();
  });
});
