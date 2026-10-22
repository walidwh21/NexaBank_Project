import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Account, Customer } from '../../models/api.models';
import { AccountApi } from '../../services/account-api.service';
import { CustomerApi } from '../../services/customer-api.service';

@Component({
  selector: 'nx-customer-detail',
  imports: [CurrencyPipe, DatePipe, RouterLink],
  template: `
    <p style="margin:0 0 1rem"><a routerLink="/customers"><i class="bi bi-arrow-left"></i> All customers</a></p>

    @if (customer(); as c) {
      <div class="page-head">
        <div class="cell-person">
          <span class="avatar" style="width:48px;height:48px;font-size:1.2rem" aria-hidden="true">{{ c.fullName.charAt(0) }}</span>
          <div>
            <h1>{{ c.fullName }}</h1>
            <p>{{ c.email }} · customer since {{ c.createdAt | date: 'MMM y' }}</p>
          </div>
        </div>
        <a class="btn" routerLink="/accounts/new" [queryParams]="{ customerId: c.id }">
          <i class="bi bi-plus-lg"></i> Open account
        </a>
      </div>

      <section class="panel">
        <div class="panel-head"><h2>Accounts</h2><span class="muted">{{ accounts().length }} total</span></div>
        @if (accounts().length) {
          <div class="table-wrap">
            <table>
              <thead><tr><th>Account</th><th>Type</th><th>Opened</th><th class="num">Balance</th></tr></thead>
              <tbody>
                @for (a of accounts(); track a.id) {
                  <tr class="row-link" (click)="open(a)">
                    <td><a class="mono" [routerLink]="['/accounts', a.id]">{{ a.id }}</a></td>
                    <td><span [class]="'pill pill-' + a.kind.toLowerCase()">{{ a.kind === 'CHECKING' ? 'Checking' : 'Savings' }}</span></td>
                    <td class="muted">{{ a.openedAt | date: 'd MMM y' }}</td>
                    <td class="num"><strong>{{ a.balance | currency: 'USD' }}</strong></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty"><strong>No accounts yet</strong>Open a checking or savings account for this customer.</div>
        }
      </section>
    }
  `,
})
export class CustomerDetailComponent implements OnInit {
  private readonly customers = inject(CustomerApi);
  private readonly accountApi = inject(AccountApi);
  private readonly router = inject(Router);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  readonly customer = signal<Customer | null>(null);
  readonly accounts = signal<Account[]>([]);

  ngOnInit(): void {
    this.customers.get(this.id()).subscribe((c) => this.customer.set(c));
    this.accountApi.list(this.id()).subscribe((list) => this.accounts.set(list));
  }

  open(account: Account): void {
    void this.router.navigate(['/accounts', account.id]);
  }
}
