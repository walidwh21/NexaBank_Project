import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CustomerApi } from './customer-api.service';

describe('CustomerApi', () => {
  let api: CustomerApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    api = TestBed.inject(CustomerApi);
    http = TestBed.inject(HttpTestingController);
  });

  it('sends the search term as the q parameter', () => {
    api.list(' hart ').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/customers'));
    expect(req.request.params.get('q')).toBe('hart');
    req.flush([]);
  });

  it('omits q when the search is blank', () => {
    api.list('  ').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/customers'));
    expect(req.request.params.has('q')).toBeFalse();
    req.flush([]);
  });
});
