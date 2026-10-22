import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    title: 'Sign in · NexaBank',
    loadComponent: () => import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'Overview · NexaBank',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'customers',
        title: 'Customers · NexaBank',
        loadComponent: () =>
          import('./features/customers/customer-list.component').then((m) => m.CustomerListComponent),
      },
      {
        path: 'customers/:id',
        title: 'Customer · NexaBank',
        loadComponent: () =>
          import('./features/customers/customer-detail.component').then((m) => m.CustomerDetailComponent),
      },
      {
        path: 'accounts',
        title: 'Accounts · NexaBank',
        loadComponent: () =>
          import('./features/accounts/account-list.component').then((m) => m.AccountListComponent),
      },
      {
        path: 'accounts/new',
        title: 'Open account · NexaBank',
        loadComponent: () =>
          import('./features/accounts/account-open.component').then((m) => m.AccountOpenComponent),
      },
      {
        path: 'accounts/:id',
        title: 'Account · NexaBank',
        loadComponent: () =>
          import('./features/accounts/account-detail.component').then((m) => m.AccountDetailComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
