import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DashboardSummary, isCredit } from '../../models/api.models';
import { DashboardApi } from '../../services/dashboard-api.service';

@Component({
  selector: 'nx-dashboard',
  imports: [CurrencyPipe, DatePipe, DecimalPipe, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Overview</h1>
        <p>Holdings across every customer account.</p>
      </div>
      <div class="page-actions">
        <a class="btn btn-quiet" routerLink="/customers"><i class="bi bi-person-plus"></i> Add customer</a>
        <a class="btn" routerLink="/accounts/new"><i class="bi bi-plus-lg"></i> Open account</a>
      </div>
    </div>

    @if (data(); as d) {
      <section class="panel">
        <div class="holdings">
          <div class="muted">Total holdings</div>
          <div class="holdings-figure">{{ d.totalBalance | currency: 'USD' }}</div>

          <div class="alloc" role="img" [attr.aria-label]="'Checking ' + checkingShare() + '%, savings ' + (100 - checkingShare()) + '%'">
            <div class="alloc-checking" [style.width.%]="checkingShare()"></div>
            <div class="alloc-savings" [style.width.%]="100 - checkingShare()"></div>
          </div>

          <div class="alloc-legend">
            <div>
              <span class="swatch" style="background:var(--lagoon)"></span>
              <span>Checking <strong class="num">{{ d.checkingBalance | currency: 'USD' }}</strong>
                <span class="muted">({{ checkingShare() | number: '1.0-0' }}%)</span></span>
            </div>
            <div>
              <span class="swatch" style="background:var(--brass)"></span>
              <span>Savings <strong class="num">{{ d.savingsBalance | currency: 'USD' }}</strong>
                <span class="muted">({{ 100 - checkingShare() | number: '1.0-0' }}%)</span></span>
            </div>
          </div>
        </div>
        <dl class="facts" style="margin:0">
          <div><dt>Customers</dt><dd>{{ d.customers }}</dd></div>
          <div><dt>Checking accounts</dt><dd>{{ d.checkingAccounts }}</dd></div>
          <div><dt>Savings accounts</dt><dd>{{ d.savingsAccounts }}</dd></div>
        </dl>
      </section>

      <section class="panel">
        <div class="panel-head"><h2>Recent activity</h2></div>
        @if (d.recentActivity.length) {
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Posted</th><th>Account</th><th>Description</th><th class="num">Amount</th></tr>
              </thead>
              <tbody>
                @for (e of d.recentActivity; track e.id) {
                  <tr>
                    <td class="muted nowrap">{{ e.postedAt | date: 'd MMM, HH:mm' }}</td>
                    <td><a class="mono" [routerLink]="['/accounts', e.accountId]">{{ e.accountId }}</a></td>
                    <td>{{ e.description }}</td>
                    <td class="num" [class.credit]="credit(e.type)" [class.debit]="!credit(e.type)">
                      {{ credit(e.type) ? '+' : '−' }}{{ e.amount | currency: 'USD' }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else {
          <div class="empty"><strong>No activity yet</strong>Deposits and transfers will appear here.</div>
        }
      </section>
    } @else {
      <div class="empty">Loading overview…</div>
    }
  `,
})
export class DashboardComponent implements OnInit {
  private readonly api = inject(DashboardApi);

  readonly data = signal<DashboardSummary | null>(null);
  readonly credit = isCredit;

  readonly checkingShare = computed(() => {
    const d = this.data();
    if (!d || d.totalBalance <= 0) return 50;
    return Math.max(0, Math.min(100, (d.checkingBalance / d.totalBalance) * 100));
  });

  ngOnInit(): void {
    this.api.summary().subscribe((summary) => this.data.set(summary));
  }
}
