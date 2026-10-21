import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
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

  it('requests the supplied offset from Express and returns the page', async () => {
    const result = firstValueFrom(service.getBooks(20));
    const request = http.expectOne('/api/books?startIndex=20');
    expect(request.request.method).toBe('GET');
    request.flush({ books: [], nextStartIndex: null });
    await expect(result).resolves.toEqual({ books: [], nextStartIndex: null });
  });
});
