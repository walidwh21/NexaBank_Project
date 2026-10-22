import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'nx-login',
  imports: [ReactiveFormsModule],
  template: `
    <div class="login">
      <section class="login-art">
        <div class="brand"><img src="logo.svg" alt="" width="40" height="40" /><span>NexaBank</span></div>
        <div>
          <h2>Every balance, one trail.</h2>
          <p>Customers, accounts and transfers in a single console, with a ledger line behind every number.</p>
          <div class="login-ledger" aria-hidden="true">
            <div><span>Opening deposit</span><span class="credit" style="color:#6fd4ae">+ 4,200.00</span></div>
            <div><span>Transfer to NX204…</span><span style="color:#ff9c94">− 650.00</span></div>
            <div><span>Salary</span><span style="color:#6fd4ae">+ 3,150.00</span></div>
          </div>
        </div>
        <small>Back-office console</small>
      </section>

      <section class="login-form-side">
        <form class="login-card" [formGroup]="form" (ngSubmit)="submit()">
          <h1>Sign in</h1>
          <p class="muted" style="margin:0 0 1.5rem">Use your staff credentials to continue.</p>

          @if (error()) {
            <div class="form-error" role="alert">{{ error() }}</div>
          }

          <div class="field">
            <label for="username">Username</label>
            <input id="username" type="text" formControlName="username" autocomplete="username" />
          </div>
          <div class="field">
            <label for="password">Password</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password" />
          </div>
          <button class="btn btn-block" type="submit" [disabled]="busy()">
            {{ busy() ? 'Signing in…' : 'Sign in' }}
          </button>

          <p class="hint">Demo build: <strong>admin</strong> / <strong>admin123</strong> (full access) or
            <strong>teller</strong> / <strong>teller123</strong> (no deletions).</p>
        </form>
      </section>
    </div>
  `,
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly busy = signal(false);
  readonly error = signal('');

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Enter both your username and password.');
      return;
    }
    this.busy.set(true);
    this.error.set('');
    const { username, password } = this.form.getRawValue();
    this.auth.login(username, password).subscribe({
      next: () => void this.router.navigateByUrl('/'),
      error: () => {
        this.busy.set(false);
        this.error.set('Those credentials were not recognised.');
      },
    });
  }
}
