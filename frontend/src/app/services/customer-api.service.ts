import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Customer, CustomerInput } from '../models/api.models';

@Injectable({ providedIn: 'root' })
export class CustomerApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/customers`;

  list(query = ''): Observable<Customer[]> {
    const params = query.trim() ? new HttpParams().set('q', query.trim()) : undefined;
    return this.http.get<Customer[]>(this.url, { params });
  }

  get(id: number | string): Observable<Customer> {
    return this.http.get<Customer>(`${this.url}/${id}`);
  }

  create(input: CustomerInput): Observable<Customer> {
    return this.http.post<Customer>(this.url, input);
  }

  update(id: number, input: CustomerInput): Observable<Customer> {
    return this.http.put<Customer>(`${this.url}/${id}`, input);
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }
}
