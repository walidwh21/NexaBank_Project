import { DatePipe } from '@angular/common';
import { Component, ElementRef, OnInit, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { EMPTY, Subject, catchError, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { Customer } from '../../models/api.models';
import { CustomerApi } from '../../services/customer-api.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

@Component({
  selector: 'nx-customer-list',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, ConfirmDialogComponent],
  template: `
    <div class="page-head">
      <div>
        <h1>Customers</h1>
        <p>{{ customers().length }} on file</p>
      </div>
      <div class="page-actions">
        <label class="search">
          <i class="bi bi-search"></i>
          <input type="search" [formControl]="search" placeholder="Search by name or e-mail" aria-label="Search customers" />
        </label>
        <button type="button" class="btn" (click)="openForm()"><i class="bi bi-person-plus"></i> New customer</button>
      </div>
    </div>

    <section class="panel">
      @if (customers().length) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Customer</th><th>E-mail</th><th class="num">Accounts</th><th>Joined</th><th></th></tr>
            </thead>
            <tbody>
              @for (c of customers(); track c.id) {
                <tr>
                  <td>
                    <div class="cell-person">
                      <span class="avatar" aria-hidden="true">{{ c.fullName.charAt(0) }}</span>
                      <a [routerLink]="['/customers', c.id]"><strong>{{ c.fullName }}</strong></a>
                    </div>
                  </td>
                  <td class="muted">{{ c.email }}</td>
                  <td class="num">{{ c.accountCount }}</td>
                  <td class="muted">{{ c.createdAt | date: 'd MMM y' }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="icon-btn" title="Edit" [attr.aria-label]="'Edit ' + c.fullName" (click)="openForm(c)">
                        <i class="bi bi-pencil"></i>
                      </button>
                      @if (auth.isAdmin()) {
                        <button type="button" class="icon-btn danger" title="Delete" [attr.aria-label]="'Delete ' + c.fullName" (click)="askDelete(c)">
                          <i class="bi bi-trash"></i>
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="empty">
          <strong>{{ search.value ? 'No customer matches your search' : 'No customers yet' }}</strong>
          {{ search.value ? 'Try a different name or e-mail.' : 'Add your first customer to start opening accounts.' }}
        </div>
      }
    </section>

    <dialog #formDialog class="dialog">
      <form [formGroup]="form" (ngSubmit)="save()">
        <h2>{{ editing() ? 'Edit customer' : 'New customer' }}</h2>
        <p class="muted">{{ editing() ? 'Update the contact details below.' : 'Contact details are used for statements.' }}</p>
        <div class="field">
          <label for="fullName">Full name</label>
          <input id="fullName" formControlName="fullName" [class.invalid]="invalid('fullName')" />
          @if (invalid('fullName')) { <span class="error">Enter at least 2 characters.</span> }
        </div>
        <div class="field">
          <label for="email">E-mail</label>
          <input id="email" type="email" formControlName="email" [class.invalid]="invalid('email')" />
          @if (invalid('email')) { <span class="error">Enter a valid e-mail address.</span> }
        </div>
        <div class="dialog-actions">
          <button type="button" class="btn btn-quiet" (click)="closeForm()">Cancel</button>
          <button type="submit" class="btn">{{ editing() ? 'Save changes' : 'Create customer' }}</button>
        </div>
      </form>
    </dialog>

    <nx-confirm-dialog
      #confirm
      heading="Delete customer?"
      [message]="pendingDelete() ? pendingDelete()!.fullName + ' will be removed permanently. Customers who still own accounts cannot be deleted.' : ''"
      (confirmed)="delete()"
    />
  `,
})
export class CustomerListComponent implements OnInit {
  private readonly api = inject(CustomerApi);
  private readonly fb = inject(FormBuilder);
  private readonly toasts = inject(ToastService);
  readonly auth = inject(AuthService);

  private readonly formDialog = viewChild.required<ElementRef<HTMLDialogElement>>('formDialog');
  private readonly confirm = viewChild.required<ConfirmDialogComponent>('confirm');
  private readonly refresh$ = new Subject<void>();

  readonly customers = signal<Customer[]>([]);
  readonly editing = signal<Customer | null>(null);
  readonly pendingDelete = signal<Customer | null>(null);
  readonly search = new FormControl('', { nonNullable: true });

  readonly form = this.fb.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
  });

  constructor() {
    this.refresh$
      .pipe(
        switchMap(() => this.api.list(this.search.value).pipe(catchError(() => EMPTY))),
        takeUntilDestroyed(),
      )
      .subscribe((list) => this.customers.set(list));

    this.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe(() => this.refresh$.next());
  }

  ngOnInit(): void {
    this.refresh$.next();
  }

  invalid(name: 'fullName' | 'email'): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || c.dirty);
  }

  openForm(customer?: Customer): void {
    this.editing.set(customer ?? null);
    this.form.reset({ fullName: customer?.fullName ?? '', email: customer?.email ?? '' });
    this.formDialog().nativeElement.showModal();
  }

  closeForm(): void {
    this.formDialog().nativeElement.close();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const input = this.form.getRawValue();
    const current = this.editing();
    const request = current ? this.api.update(current.id, input) : this.api.create(input);
    request.subscribe({
      next: () => {
        this.closeForm();
        this.toasts.success(current ? 'Customer updated.' : 'Customer created.');
        this.refresh$.next();
      },
    });
  }

  askDelete(customer: Customer): void {
    this.pendingDelete.set(customer);
    this.confirm().open();
  }

  delete(): void {
    const target = this.pendingDelete();
    if (!target) return;
    this.api.remove(target.id).subscribe({
      next: () => {
        this.toasts.success('Customer deleted.');
        this.refresh$.next();
      },
    });
  }
}
