import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Account, AccountKind } from '../../models/api.models';
import { AccountApi } from '../../services/account-api.service';

type KindFilter = 'ALL' | AccountKind;

@Component({
  selector: 'nx-account-list',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Accounts</h1>
        <p>{{ visible().length }} of {{ accounts().length }} shown</p>
      </div>
      <div class="page-actions">
        <div class="segmented" role="group" aria-label="Filter by account type">
          @for (f of filters; track f.value) {
            <button type="button" [class.on]="kind() === f.value" (click)="kind.set(f.value)">{{ f.label }}</button>
          }
        </div>
        <label class="search">
          <i class="bi bi-search"></i>
          <input type="search" placeholder="Number or holder" aria-label="Search accounts"
                 [value]="term()" (input)="term.set($any($event.target).value)" />
        </label>
        <a class="btn" routerLink="/accounts/new"><i class="bi bi-plus-lg"></i> Open account</a>
      </div>
    </div>

    <section class="panel">
      @if (visible().length) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Account</th><th>Type</th><th>Holder</th><th>Opened</th><th>Status</th><th class="num">Balance</th></tr>
            </thead>
            <tbody>
              @for (a of visible(); track a.id) {
                <tr class="row-link" (click)="open(a)">
                  <td><a class="mono" [routerLink]="['/accounts', a.id]" (click)="$event.stopPropagation()">{{ a.id }}</a></td>
                  <td><span [class]="'pill pill-' + a.kind.toLowerCase()">{{ a.kind === 'CHECKING' ? 'Checking' : 'Savings' }}</span></td>
                  <td>{{ a.customerName }}</td>
                  <td class="muted">{{ a.openedAt | date: 'd MMM y' }}</td>
                  <td><span [class]="a.status === 'ACTIVE' ? 'pill' : 'pill pill-suspended'">{{ a.status.toLowerCase() }}</span></td>
                  <td class="num" [class.debit]="a.balance < 0"><strong>{{ a.balance | currency: 'USD' }}</strong></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty"><strong>No accounts match</strong>Adjust the filter or open a new account.</div>
      }
    </section>
  `,
})
export class AccountListComponent implements OnInit {
  private readonly api = inject(AccountApi);
  private readonly router = inject(Router);

  readonly filters: { value: KindFilter; label: string }[] = [
    { value: 'ALL', label: 'All' },
    { value: 'CHECKING', label: 'Checking' },
    { value: 'SAVINGS', label: 'Savings' },
  ];

  readonly accounts = signal<Account[]>([]);
  readonly kind = signal<KindFilter>('ALL');
  readonly term = signal('');

  readonly visible = computed(() => {
    const needle = this.term().trim().toLowerCase();
    return this.accounts().filter(
      (a) =>
        (this.kind() === 'ALL' || a.kind === this.kind()) &&
        (!needle || a.id.toLowerCase().includes(needle) || a.customerName.toLowerCase().includes(needle)),
    );
  });

  ngOnInit(): void {
    this.api.list().subscribe((list) => this.accounts.set(list));
  }

  open(account: Account): void {
    void this.router.navigate(['/accounts', account.id]);
  }
}
