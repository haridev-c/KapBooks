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

  it('gets the normalized response through the relative Express endpoint', async () => {
    const result = firstValueFrom(service.getBooks());
    const request = http.expectOne('/api/books');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush({ books: [] });
    await expect(result).resolves.toEqual({ books: [] });
  });

  it('passes backend failures to its caller', async () => {
    const result = firstValueFrom(service.getBooks());
    const assertion = expect(result).rejects.toMatchObject({ status: 502 });
    http
      .expectOne('/api/books')
      .flush(
        { error: { code: 'UPSTREAM_FAILURE', message: 'Unable to fetch books.' } },
        { status: 502, statusText: 'Bad Gateway' },
      );
    await assertion;
  });
});
