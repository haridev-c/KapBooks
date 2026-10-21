import { TestBed, type ComponentFixture } from '@angular/core/testing';
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

describe('books list integration', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;
  let store: Store;
  let intersect: (entries: { isIntersecting: boolean }[]) => void;
  let options: IntersectionObserverInit;
  let observe: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  let log: ReturnType<typeof vi.spyOn>;
  let errorLog: ReturnType<typeof vi.spyOn>;

  function render() {
    fixture.detectChanges();
    TestBed.tick();
  }

  function scrollNearBottom() {
    intersect([{ isIntersecting: true }]);
  }

  function text(): string {
    return fixture.nativeElement.textContent;
  }

  beforeEach(async () => {
    observe = vi.fn();
    disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        observe = observe;
        disconnect = disconnect;
        constructor(callback: typeof intersect, config: IntersectionObserverInit) {
          intersect = callback;
          options = config;
        }
      },
    );
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
    fixture = TestBed.createComponent(App);
    render();
  });

  afterEach(() => {
    fixture.destroy();
    http.verify();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('loads once at startup, renders fields, and logs the page once', async () => {
    render();
    expect(text()).toContain('Loading books');
    expect(observe).not.toHaveBeenCalled();
    const request = http.expectOne('/api/books?startIndex=0');
    expect(request.request.method).toBe('GET');
    request.flush({ books: [book], nextStartIndex: 20 });
    render();

    expect(await firstValueFrom(store.select(booksFeature.selectBooksState))).toEqual({
      books: [book],
      loading: false,
      error: null,
      nextStartIndex: 20,
    });
    expect(text()).toContain('Kaplan Test Prep');
    expect(text()).toContain('Publisher: Unknown');
    expect(text()).toContain('Published date: 2024');
    expect(text()).not.toContain('Loading books');
    expect(log).toHaveBeenCalledExactlyOnceWith('Books loaded:', [book]);
    expect(errorLog).not.toHaveBeenCalled();
    expect(options.rootMargin).toBe('0px 0px 300px 0px');
    expect(observe).toHaveBeenCalledOnce();
  });

  it('appends unique books on intersection and suppresses concurrent loads', async () => {
    scrollNearBottom();
    store.dispatch(booksActions.load());
    http.expectOne('/api/books?startIndex=0').flush({ books: [book], nextStartIndex: 20 });
    render();
    intersect([{ isIntersecting: false }]);
    http.expectNone('/api/books?startIndex=20');

    scrollNearBottom();
    scrollNearBottom();
    store.dispatch(booksActions.load());
    const second = { ...book, id: 'two', title: 'Second book' };
    http.expectOne('/api/books?startIndex=20').flush({
      books: [{ ...book, title: 'Duplicate' }, second],
      nextStartIndex: 40,
    });
    render();

    expect(await firstValueFrom(store.select(booksFeature.selectBooks))).toEqual([book, second]);
    expect(fixture.nativeElement.querySelectorAll('li')).toHaveLength(2);
    expect(text()).toContain('Second book');
    expect(text()).not.toContain('Duplicate');
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('re-observes after every page, including duplicate-only pages, to fill short viewports', () => {
    http.expectOne('/api/books?startIndex=0').flush({ books: [book], nextStartIndex: 20 });
    render();
    expect(observe).toHaveBeenCalledTimes(1);
    scrollNearBottom();
    http.expectOne('/api/books?startIndex=20').flush({ books: [book], nextStartIndex: 40 });
    render();
    expect(observe).toHaveBeenCalledTimes(2);
    scrollNearBottom();
    http.expectOne('/api/books?startIndex=40').flush({ books: [], nextStartIndex: null });
    render();
    expect(text()).toContain('All books loaded.');
    expect(observe).toHaveBeenCalledTimes(2);
    scrollNearBottom();
    store.dispatch(booksActions.load());
    store.dispatch(booksActions.retry());
    http.expectNone((request) => request.url === '/api/books');
  });

  it('keeps loaded books after an error and retries the same offset only on explicit Retry', async () => {
    http.expectOne('/api/books?startIndex=0').flush({ books: [book], nextStartIndex: 20 });
    render();
    scrollNearBottom();
    const error = { code: 'UPSTREAM_TIMEOUT', message: 'Google Books request timed out.' };
    http
      .expectOne('/api/books?startIndex=20')
      .flush({ error }, { status: 504, statusText: 'Gateway Timeout' });
    render();
    expect(await firstValueFrom(store.select(booksFeature.selectBooksState))).toEqual({
      books: [book],
      loading: false,
      error,
      nextStartIndex: 20,
    });
    expect(text()).toContain('Kaplan');
    expect(text()).toContain(error.message);
    expect(errorLog).toHaveBeenCalledExactlyOnceWith('Books load failed:', error.message);
    scrollNearBottom();
    store.dispatch(booksActions.load());
    http.expectNone((request) => request.url === '/api/books');
    fixture.nativeElement.querySelector('button').click();
    render();
    const second = { ...book, id: 'two' };
    http.expectOne('/api/books?startIndex=20').flush({ books: [second], nextStartIndex: 40 });
    render();
    expect(await firstValueFrom(store.select(booksFeature.selectError))).toBeNull();
    expect(await firstValueFrom(store.select(booksFeature.selectBooks))).toEqual([book, second]);
    expect(observe).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('shows a retryable initial network error and an empty state after successful retry', () => {
    http.expectOne('/api/books?startIndex=0').error(new ProgressEvent('error'));
    render();
    expect(text()).toContain('Unable to load books. Please try again.');
    expect(text()).not.toContain('No books found.');
    expect(observe).not.toHaveBeenCalled();
    fixture.nativeElement.querySelector('button').click();
    http.expectOne('/api/books?startIndex=0').flush({ books: [], nextStartIndex: null });
    render();
    expect(text()).toContain('No books found.');
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
    expect(observe).not.toHaveBeenCalled();
    expect(errorLog).toHaveBeenCalledExactlyOnceWith(
      'Books load failed:',
      'Unable to load books. Please try again.',
    );
  });

  it('disconnects the observer when destroyed', () => {
    http.expectOne('/api/books?startIndex=0').flush({ books: [book], nextStartIndex: 20 });
    render();
    disconnect.mockClear();
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
