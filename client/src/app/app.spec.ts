import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore, Store } from '@ngrx/store';
import { firstValueFrom } from 'rxjs';
import { App } from './app';
import { BooksEffects } from './books/books.effects';
import { booksActions, booksFeature } from './books/books.state';

const book = {
  id: 'one',
  title: 'Kaplan',
  authors: ['Kaplan Test Prep'],
  publisher: null,
  publishedDate: '2024',
};

describe('App', () => {
  let http: HttpTestingController;
  let store: Store;
  let log: ReturnType<typeof vi.spyOn>;
  let errorLog: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    log = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorLog = vi.spyOn(console, 'error').mockImplementation(() => {});
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideStore(),
        provideState(booksFeature),
        provideEffects(BooksEffects),
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(Store);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('loads once at startup, updates state, logs once, and retains the starter title', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    fixture.detectChanges();

    expect(await firstValueFrom(store.select(booksFeature.selectLoading))).toBe(true);
    const request = http.expectOne('/api/books');
    expect(request.request.method).toBe('GET');
    request.flush({ books: [book] });

    expect(await firstValueFrom(store.select(booksFeature.selectBooksState))).toEqual({
      books: [book],
      loading: false,
      error: null,
    });
    expect(log).toHaveBeenCalledExactlyOnceWith('Books loaded:', [book]);
    expect(errorLog).not.toHaveBeenCalled();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Hello, client');
  });

  it('records a server error and can successfully retry without resubscribing effects', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const error = { code: 'UPSTREAM_TIMEOUT', message: 'Google Books collection timed out.' };
    http.expectOne('/api/books').flush({ error }, { status: 504, statusText: 'Gateway Timeout' });

    expect(await firstValueFrom(store.select(booksFeature.selectBooksState))).toEqual({
      books: [],
      loading: false,
      error,
    });
    expect(errorLog).toHaveBeenCalledExactlyOnceWith('Books load failed:', error.message);
    expect(log).not.toHaveBeenCalled();

    store.dispatch(booksActions.load());
    expect(await firstValueFrom(store.select(booksFeature.selectError))).toBeNull();
    http.expectOne('/api/books').flush({ books: [book] });
    expect(await firstValueFrom(store.select(booksFeature.selectBooks))).toEqual([book]);
    expect(await firstValueFrom(store.select(booksFeature.selectLoading))).toBe(false);
    expect(log).toHaveBeenCalledExactlyOnceWith('Books loaded:', [book]);
  });

  it('ignores concurrent load actions and allows another request after completion', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    store.dispatch(booksActions.load());
    store.dispatch(booksActions.load());
    http.expectOne('/api/books').flush({ books: [] });
    expect(log).toHaveBeenCalledExactlyOnceWith('Books loaded:', []);

    store.dispatch(booksActions.load());
    http.expectOne('/api/books').flush({ books: [book] });
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('uses a readable fallback for network failures', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    http.expectOne('/api/books').error(new ProgressEvent('error'));
    expect(await firstValueFrom(store.select(booksFeature.selectError))).toEqual({
      code: 'LOAD_FAILED',
      message: 'Unable to load books. Please try again.',
    });
    expect(errorLog).toHaveBeenCalledExactlyOnceWith(
      'Books load failed:',
      'Unable to load books. Please try again.',
    );
  });
});
