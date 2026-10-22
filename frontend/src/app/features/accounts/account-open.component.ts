import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastService } from '../../core/toast.service';
import { AccountKind, Customer, OpenAccountInput } from '../../models/api.models';
import { AccountApi } from '../../services/account-api.service';
import { CustomerApi } from '../../services/customer-api.service';

@Component({
  selector: 'nx-account-open',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="page-head">
      <div>
        <h1>Open an account</h1>
        <p>Choose the product, the holder and an optional opening deposit.</p>
      </div>
    </div>

    <section class="panel" style="max-width:560px">
      <form class="panel-body" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field">
          <span class="label">Account type</span>
          <div class="segmented" role="group" aria-label="Account type" style="align-self:flex-start">
            <button type="button" [class.on]="kind() === 'CHECKING'" (click)="setKind('CHECKING')">Checking</button>
            <button type="button" [class.on]="kind() === 'SAVINGS'" (click)="setKind('SAVINGS')">Savings</button>
          </div>
          <small>{{ kind() === 'CHECKING' ? 'Everyday account that can use an overdraft limit.' : 'Earns interest and can never go below zero.' }}</small>
        </div>

        <div class="field">
          <label for="customerId">Holder</label>
          <select id="customerId" formControlName="customerId" [class.invalid]="touched('customerId')">
            <option [ngValue]="null" disabled>Select a customer</option>
            @for (c of customers(); track c.id) {
              <option [ngValue]="c.id">{{ c.fullName }} — {{ c.email }}</option>
            }
          </select>
          @if (touched('customerId')) { <span class="error">Choose who owns this account.</span> }
        </div>

        <div class="field">
          <label for="initialDeposit">Opening deposit (USD)</label>
          <input id="initialDeposit" type="number" step="0.01" min="0" formControlName="initialDeposit" />
        </div>

        @if (kind() === 'CHECKING') {
          <div class="field">
            <label for="overdraftLimit">Overdraft limit (USD)</label>
            <input id="overdraftLimit" type="number" step="50" min="0" formControlName="overdraftLimit" />
          </div>
        } @else {
          <div class="field">
            <label for="annualRate">Annual interest rate (%)</label>
            <input id="annualRate" type="number" step="0.05" min="0" max="25" formControlName="annualRate" />
          </div>
        }

        <div class="page-actions" style="margin-top:0.5rem">
          <button class="btn" type="submit" [disabled]="busy()">{{ busy() ? 'Opening…' : 'Open account' }}</button>
          <a class="btn btn-quiet" routerLink="/accounts">Cancel</a>
        </div>
      </form>
    </section>
  `,
})
export class AccountOpenComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly accounts = inject(AccountApi);
  private readonly customerApi = inject(CustomerApi);
  private readonly router = inject(Router);
  private readonly toasts = inject(ToastService);

  /** Optional ?customerId= query parameter pre-selects the holder. */
  readonly customerId = input<string>();

  readonly customers = signal<Customer[]>([]);
  readonly kind = signal<AccountKind>('CHECKING');
  readonly busy = signal(false);

  readonly form = this.fb.group({
    customerId: this.fb.control<number | null>(null, Validators.required),
    initialDeposit: this.fb.nonNullable.control(0, [Validators.required, Validators.min(0)]),
    overdraftLimit: this.fb.nonNullable.control(500, Validators.min(0)),
    annualRate: this.fb.nonNullable.control(2.5, [Validators.min(0), Validators.max(25)]),
  });

  ngOnInit(): void {
    this.customerApi.list().subscribe((list) => {
      this.customers.set(list);
      const preset = Number(this.customerId());
      if (preset && list.some((c) => c.id === preset)) {
        this.form.controls.customerId.setValue(preset);
      }
    });
  }

  setKind(kind: AccountKind): void {
    this.kind.set(kind);
  }

  touched(name: 'customerId'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const payload: OpenAccountInput = {
      kind: this.kind(),
      customerId: v.customerId!,
      initialDeposit: v.initialDeposit,
      ...(this.kind() === 'CHECKING' ? { overdraftLimit: v.overdraftLimit } : { annualRate: v.annualRate }),
    };
    this.busy.set(true);
    this.accounts.open(payload).subscribe({
      next: (account) => {
        this.toasts.success('Account ' + account.id + ' is open.');
        void this.router.navigate(['/accounts', account.id]);
      },
      error: () => this.busy.set(false),
    });
  }
}
