import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
  exact: boolean;
}

@Component({
  selector: 'nx-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="shell" [class.shell-open]="menuOpen()">
      <aside class="rail">
        <a class="brand" routerLink="/" (click)="menuOpen.set(false)">
          <img src="logo.svg" alt="" width="34" height="34" />
          <span>NexaBank</span>
        </a>

        <nav class="rail-nav" aria-label="Main">
          @for (item of nav; track item.link) {
            <a
              [routerLink]="item.link"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.exact }"
              (click)="menuOpen.set(false)"
            >
              <i class="bi" [class]="'bi-' + item.icon"></i>
              {{ item.label }}
            </a>
          }
        </nav>

        <div class="rail-user">
          <span class="avatar" aria-hidden="true">{{ initial() }}</span>
          <div class="rail-user-text">
            <strong>{{ auth.session()?.username }}</strong>
            <small>{{ roleLabel() }}</small>
          </div>
          <button type="button" class="icon-btn" title="Sign out" aria-label="Sign out" (click)="auth.logout()">
            <i class="bi bi-box-arrow-right"></i>
          </button>
        </div>
      </aside>

      <div class="stage">
        <header class="mobile-bar">
          <button type="button" class="icon-btn" aria-label="Toggle navigation" (click)="menuOpen.set(!menuOpen())">
            <i class="bi bi-list"></i>
          </button>
          <strong>NexaBank</strong>
        </header>
        <main class="page">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly menuOpen = signal(false);

  readonly nav: NavItem[] = [
    { label: 'Overview', icon: 'grid-1x2', link: '/', exact: true },
    { label: 'Customers', icon: 'people', link: '/customers', exact: false },
    { label: 'Accounts', icon: 'wallet2', link: '/accounts', exact: true },
    { label: 'Open account', icon: 'plus-circle', link: '/accounts/new', exact: true },
  ];

  readonly initial = computed(() => (this.auth.session()?.username ?? '?').charAt(0).toUpperCase());
  readonly roleLabel = computed(() => (this.auth.isAdmin() ? 'Administrator' : 'Teller'));
}
