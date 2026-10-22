import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Account,
  CashInput,
  LedgerEntry,
  OpenAccountInput,
  Statement,
  TransferInput,
} from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class AccountApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/accounts`;

  list(customerId?: number | string): Observable<Account[]> {
    const params = customerId ? new HttpParams().set('customerId', String(customerId)) : undefined;
    return this.http.get<Account[]>(this.url, { params });
  }

  get(id: string): Observable<Account> {
    return this.http.get<Account>(`${this.url}/${id}`);
  }

  open(input: OpenAccountInput): Observable<Account> {
    return this.http.post<Account>(this.url, input);
  }

  remove(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  statement(id: string, page: number, size = 8): Observable<Statement> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Statement>(`${this.url}/${id}/statement`, { params });
  }

  deposit(id: string, input: CashInput): Observable<LedgerEntry> {
    return this.http.post<LedgerEntry>(`${this.url}/${id}/deposits`, input);
  }

  withdraw(id: string, input: CashInput): Observable<LedgerEntry> {
    return this.http.post<LedgerEntry>(`${this.url}/${id}/withdrawals`, input);
  }

  transfer(input: TransferInput): Observable<unknown> {
    return this.http.post(`${environment.apiUrl}/transfers`, input);
  }
}
