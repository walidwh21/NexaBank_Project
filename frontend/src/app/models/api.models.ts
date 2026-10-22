export type AccountKind = 'CHECKING' | 'SAVINGS';
export type AccountStatus = 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
export type EntryType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT';

export interface Session {
  token: string;
  expiresAt: string;
  username: string;
  roles: string[];
}

export interface Customer {
  id: number;
  fullName: string;
  email: string;
  accountCount: number;
  createdAt: string;
}

export interface CustomerInput {
  fullName: string;
  email: string;
}

export interface Account {
  id: string;
  kind: AccountKind;
  status: AccountStatus;
  balance: number;
  openedAt: string;
  customerId: number;
  customerName: string;
  overdraftLimit: number | null;
  annualRate: number | null;
}

export interface OpenAccountInput {
  kind: AccountKind;
  customerId: number;
  initialDeposit: number;
  overdraftLimit?: number;
  annualRate?: number;
}

export interface LedgerEntry {
  id: number;
  accountId: string;
  type: EntryType;
  amount: number;
  balanceAfter: number;
  description: string | null;
  postedAt: string;
}

export interface Statement {
  accountId: string;
  balance: number;
  page: number;
  size: number;
  totalPages: number;
  totalEntries: number;
  entries: LedgerEntry[];
}

export interface CashInput {
  amount: number;
  description?: string;
}

export interface TransferInput extends CashInput {
  fromAccountId: string;
  toAccountId: string;
}

export interface DashboardSummary {
  customers: number;
  checkingAccounts: number;
  savingsAccounts: number;
  checkingBalance: number;
  savingsBalance: number;
  totalBalance: number;
  recentActivity: LedgerEntry[];
}

/** Direction of a ledger entry from the point of view of the account balance. */
export function isCredit(type: EntryType): boolean {
  return type === 'DEPOSIT' || type === 'TRANSFER_IN';
}
