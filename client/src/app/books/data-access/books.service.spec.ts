import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { book } from '../../../testing/fixtures';
import { BooksService } from './books.service';
describe('BooksService', () => {
  let http: HttpTestingController;
  let service: BooksService;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(BooksService);
  });
  afterEach(() => http.verify());
  it('requests the page index and returns the response', () => {
    const next = vi.fn();
    const page = { books: [book()], nextStartIndex: 40 };
    service.getBooks(20).subscribe(next);
    const request = http.expectOne('/api/books?startIndex=20');
    expect(request.request.method).toBe('GET');
    request.flush(page);
    expect(next).toHaveBeenCalledWith(page);
  });
  it('propagates HTTP failures', () => {
    const error = vi.fn();
    service.getBooks(0).subscribe({ error });
    http
      .expectOne('/api/books?startIndex=0')
      .flush('Unavailable', { status: 503, statusText: 'Unavailable' });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
  });
});
