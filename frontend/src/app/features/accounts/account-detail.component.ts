import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Account, Statement, isCredit } from '../../models/api.models';
import { AccountApi } from '../../services/account-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

type Mode = 'deposit' | 'withdraw' | 'transfer';

@Component({
  selector: 'nx-account-detail',
  imports: [CurrencyPipe, DatePipe, ReactiveFormsModule, RouterLink, ConfirmDialogComponent],
  template: `
    <p style="margin:0 0 1rem"><a routerLink="/accounts"><i class="bi bi-arrow-left"></i> All accounts</a></p>

    @if (account(); as a) {
      <div class="page-head">
        <div>
          <div class="balance-hero">
            <h1 class="mono" style="font-size:1.35rem">{{ a.id }}</h1>
            <span [class]="'pill pill-' + a.kind.toLowerCase()">{{ a.kind === 'CHECKING' ? 'Checking' : 'Savings' }}</span>
            @if (a.status !== 'ACTIVE') { <span class="pill pill-suspended">{{ a.status.toLowerCase() }}</span> }
          </div>
          <dl class="meta-list">
            <div><dt>Holder</dt><dd><a [routerLink]="['/customers', a.customerId]">{{ a.customerName }}</a></dd></div>
            <div><dt>Opened</dt><dd>{{ a.openedAt | date: 'd MMM y' }}</dd></div>
            @if (a.kind === 'CHECKING') {
              <div><dt>Overdraft limit</dt><dd>{{ a.overdraftLimit ?? 0 | currency: 'USD' }}</dd></div>
            } @else {
              <div><dt>Interest rate</dt><dd>{{ a.annualRate }}% a year</dd></div>
            }
          </dl>
        </div>
        <div style="text-align:right">
          <div class="muted">Current balance</div>
          <div class="balance-hero" style="justify-content:flex-end">
            <span class="figure" [class.debit]="a.balance < 0">{{ a.balance | currency: 'USD' }}</span>
          </div>
          @if (auth.isAdmin()) {
            <button type="button" class="btn btn-quiet" style="margin-top:0.6rem" (click)="confirmDelete.open()">
              <i class="bi bi-trash"></i> Delete account
            </button>
          }
        </div>
      </div>

      <div class="split">
        <section class="panel">
          <div class="panel-head"><h2>Statement</h2><span class="muted">{{ statement()?.totalEntries ?? 0 }} entries</span></div>
          @if (statement(); as s) {
            @if (s.entries.length) {
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr><th>Posted</th><th>Description</th><th class="num">Amount</th><th class="num">Balance</th></tr>
                  </thead>
                  <tbody>
                    @for (e of s.entries; track e.id) {
                      <tr>
                        <td class="muted nowrap">{{ e.postedAt | date: 'd MMM y, HH:mm' }}</td>
                        <td>{{ e.description }}</td>
                        <td class="num" [class.credit]="credit(e.type)" [class.debit]="!credit(e.type)">
                          {{ credit(e.type) ? '+' : '−' }}{{ e.amount | currency: 'USD' }}
                        </td>
                        <td class="num muted">{{ e.balanceAfter | currency: 'USD' }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
              <div class="pager">
                <button type="button" class="btn btn-quiet" [disabled]="s.page === 0" (click)="goto(s.page - 1)">Newer</button>
                <span>Page {{ s.page + 1 }} of {{ s.totalPages }}</span>
                <button type="button" class="btn btn-quiet" [disabled]="s.page + 1 >= s.totalPages" (click)="goto(s.page + 1)">Older</button>
              </div>
            } @else {
              <div class="empty"><strong>Nothing posted yet</strong>Make a deposit to create the first entry.</div>
            }
          }
        </section>

        <section class="panel">
          <div class="panel-head"><h2>Move money</h2></div>
          <form class="panel-body" [formGroup]="form" (ngSubmit)="submit()">
            <div class="segmented block" role="group" aria-label="Operation">
              <button type="button" [class.on]="mode() === 'deposit'" (click)="setMode('deposit')">Deposit</button>
              <button type="button" [class.on]="mode() === 'withdraw'" (click)="setMode('withdraw')">Withdraw</button>
              <button type="button" [class.on]="mode() === 'transfer'" (click)="setMode('transfer')">Transfer</button>
            </div>
            @if (mode() === 'transfer') {
              <div class="field">
                <label for="destination">To account</label>
                <input id="destination" formControlName="destination" list="destinations" placeholder="NX…" autocomplete="off" />
                <datalist id="destinations">
                  @for (o of others(); track o.id) { <option [value]="o.id">{{ o.customerName }}</option> }
                </datalist>
                @if (form.controls.destination.touched && form.controls.destination.invalid) {
                  <span class="error">Enter the destination account number.</span>
                }
              </div>
            }
            <div class="field">
              <label for="amount">Amount (USD)</label>
              <input id="amount" type="number" step="0.01" min="0.01" formControlName="amount"
                     [class.invalid]="form.controls.amount.touched && form.controls.amount.invalid" />
              @if (form.controls.amount.touched && form.controls.amount.invalid) {
                <span class="error">Enter an amount of at least 0.01.</span>
              }
            </div>
            <div class="field">
              <label for="description">Reference <span class="muted" style="font-weight:400">(optional)</span></label>
              <input id="description" formControlName="description" maxlength="200" />
            </div>
            <button class="btn btn-block" type="submit" [disabled]="busy()">
              {{ mode() === 'deposit' ? 'Post deposit' : mode() === 'withdraw' ? 'Post withdrawal' : 'Send transfer' }}
            </button>
          </form>
        </section>
      </div>

      <nx-confirm-dialog
        #confirmDelete
        heading="Delete this account?"
        message="The statement history is removed with it. Only accounts with a zero balance can be deleted."
        (confirmed)="remove()"
      />
    }
  `,
})
export class AccountDetailComponent implements OnInit {
  private readonly api = inject(AccountApi);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);
  readonly auth = inject(AuthService);

  /** Bound from the :id route parameter. */
  readonly id = input.required<string>();

  readonly account = signal<Account | null>(null);
  readonly statement = signal<Statement | null>(null);
  readonly others = signal<Account[]>([]);
  readonly mode = signal<Mode>('deposit');
  readonly busy = signal(false);
  readonly credit = isCredit;

  readonly form = this.fb.group({
    amount: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    description: this.fb.nonNullable.control(''),
    destination: this.fb.nonNullable.control(''),
  });

  ngOnInit(): void {
    this.api.list().subscribe((list) => this.others.set(list.filter((a) => a.id !== this.id())));
    this.reload(0);
  }

  setMode(mode: Mode): void {
    this.mode.set(mode);
    const dest = this.form.controls.destination;
    dest.setValidators(mode === 'transfer' ? [Validators.required] : []);
    dest.updateValueAndValidity();
  }

  goto(page: number): void {
    this.reload(page);
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { amount, description, destination } = this.form.getRawValue();
    const body = { amount: amount!, description: description.trim() || undefined };
    const id = this.id();
    this.busy.set(true);

    const done = (message: string) => {
      this.busy.set(false);
      this.toasts.success(message);
      this.form.reset({ amount: null, description: '', destination: '' });
      this.reload(0);
    };
    const failed = () => this.busy.set(false);

    switch (this.mode()) {
      case 'deposit':
        this.api.deposit(id, body).subscribe({ next: () => done('Deposit posted.'), error: failed });
        break;
      case 'withdraw':
        this.api.withdraw(id, body).subscribe({ next: () => done('Withdrawal posted.'), error: failed });
        break;
      case 'transfer':
        this.api
          .transfer({ ...body, fromAccountId: id, toAccountId: destination.trim() })
          .subscribe({ next: () => done('Transfer sent.'), error: failed });
        break;
    }
  }

  remove(): void {
    this.api.remove(this.id()).subscribe({
      next: () => {
        this.toasts.success('Account deleted.');
        void this.router.navigateByUrl('/accounts');
      },
    });
  }

  private reload(page: number): void {
    this.api.get(this.id()).subscribe((a) => this.account.set(a));
    this.api.statement(this.id(), page).subscribe((s) => this.statement.set(s));
  }
}
