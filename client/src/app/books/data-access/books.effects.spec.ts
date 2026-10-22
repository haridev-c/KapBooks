import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Actions } from '@ngrx/effects';
import { Action, Store } from '@ngrx/store';
import { BehaviorSubject, Subject, Subscription } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { book } from '../../../testing/fixtures';
import { BooksResponse } from './book';
import { BooksEffects } from './books.effects';
import { BooksService } from './books.service';
import { booksActions as a, booksFeature } from './books.state';

describe('BooksEffects', () => {
  let actions: Subject<Action>;
  let state: BehaviorSubject<ReturnType<typeof booksFeature.reducer>>;
  let response: Subject<BooksResponse>;
  let getBooks: ReturnType<typeof vi.fn>;
  let effects: BooksEffects;
  let subscriptions: Subscription;
  beforeEach(() => {
    actions = new Subject();
    state = new BehaviorSubject(booksFeature.reducer(undefined, { type: 'init' }));
    response = new Subject();
    getBooks = vi.fn(() => response);
    subscriptions = new Subscription();
    TestBed.configureTestingModule({
      providers: [
        BooksEffects,
        { provide: Actions, useValue: actions },
        { provide: Store, useValue: { select: () => state } },
        { provide: BooksService, useValue: { getBooks } },
      ],
    });
    effects = TestBed.inject(BooksEffects);
  });
  afterEach(() => subscriptions.unsubscribe());
  it('requests the next page for load and retry', () => {
    const emitted = vi.fn();
    subscriptions.add(effects.requestPage$.subscribe(emitted));
    state.next({ ...state.value, nextStartIndex: 20 });
    actions.next(a.load());
    actions.next(a.retry());
    expect(emitted.mock.calls).toEqual([
      [a.loadPage({ startIndex: 20 })],
      [a.loadPage({ startIndex: 20 })],
    ]);
  });
  it.each([{ loading: true }, { nextStartIndex: null }])(
    'ignores load and retry when %j',
    (patch) => {
      const emitted = vi.fn();
      subscriptions.add(effects.requestPage$.subscribe(emitted));
      state.next({ ...state.value, ...patch });
      actions.next(a.load());
      actions.next(a.retry());
      expect(emitted).not.toHaveBeenCalled();
    },
  );
  it('requires explicit retry after an error and retries the same index', () => {
    const emitted = vi.fn();
    subscriptions.add(effects.requestPage$.subscribe(emitted));
    state.next({
      ...state.value,
      nextStartIndex: 20,
      error: { code: 'OFFLINE', message: 'Offline' },
    });
    actions.next(a.load());
    expect(emitted).not.toHaveBeenCalled();
    actions.next(a.retry());
    expect(emitted).toHaveBeenCalledExactlyOnceWith(a.loadPage({ startIndex: 20 }));
  });
  it('ignores overlapping requests, emits success, and accepts a later request', () => {
    const emitted = vi.fn();
    subscriptions.add(effects.load$.subscribe(emitted));
    actions.next(a.loadPage({ startIndex: 0 }));
    actions.next(a.loadPage({ startIndex: 20 }));
    expect(getBooks).toHaveBeenCalledExactlyOnceWith(0);
    const page = { books: [book()], nextStartIndex: 20 };
    response.next(page);
    response.complete();
    expect(emitted).toHaveBeenCalledWith(a.loadSuccess(page));
    response = new Subject();
    actions.next(a.loadPage({ startIndex: 20 }));
    expect(getBooks).toHaveBeenLastCalledWith(20);
  });
  it.each([
    [
      new HttpErrorResponse({ error: { error: { code: 'UPSTREAM', message: 'Try later' } } }),
      { code: 'UPSTREAM', message: 'Try later' },
    ],
    [
      new HttpErrorResponse({ error: { error: { code: 42, message: 'Bad code' } } }),
      { code: 'LOAD_FAILED', message: 'Unable to load books. Please try again.' },
    ],
    [
      new Error('Network'),
      { code: 'LOAD_FAILED', message: 'Unable to load books. Please try again.' },
    ],
  ])('maps failures and continues handling future loads', (error, expected) => {
    const emitted = vi.fn();
    subscriptions.add(effects.load$.subscribe(emitted));
    actions.next(a.loadPage({ startIndex: 0 }));
    response.error(error);
    expect(emitted).toHaveBeenCalledWith(a.loadFailure({ error: expected }));
    response = new Subject();
    actions.next(a.loadPage({ startIndex: 0 }));
    response.next({ books: [], nextStartIndex: null });
    expect(emitted).toHaveBeenLastCalledWith(a.loadSuccess({ books: [], nextStartIndex: null }));
  });
});
