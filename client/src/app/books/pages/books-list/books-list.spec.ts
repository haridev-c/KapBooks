import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { book } from '../../../../testing/fixtures';
import { click, enter, text } from '../../../../testing/dom';
import { LibraryDialogs } from '../../../library/library-dialogs';
import { BooksFacade } from '../../data-access/books.facade';
import { BooksList } from './books-list';
import { booksFeature } from '../../data-access/books.state';

describe('BooksList', () => {
  const state = signal(booksFeature.reducer(undefined, { type: 'init' }));
  const facade = {
    state,
    books: computed(() => state().books),
    visibleBooks: signal([book()]),
    searching: computed(() => !!state().query.trim()),
    load: vi.fn(),
    retry: vi.fn(),
    search: vi.fn(),
  };
  const dialogs = { editBook: vi.fn(), deleteBook: vi.fn() };
  let callback: IntersectionObserverCallback;
  let observe: ReturnType<typeof vi.fn>;
  let disconnect: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    state.set(booksFeature.reducer(undefined, { type: 'init' }));
    facade.visibleBooks.set([book()]);
    observe = vi.fn();
    disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        constructor(cb: IntersectionObserverCallback) {
          callback = cb;
        }
        observe = observe;
        disconnect = disconnect;
      },
    );
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: BooksFacade, useValue: facade },
        { provide: LibraryDialogs, useValue: dialogs },
      ],
    });
  });
  afterEach(() => vi.unstubAllGlobals());
  async function setup() {
    const fixture = TestBed.createComponent(BooksList);
    await fixture.whenStable();
    return fixture;
  }
  function intersect(isIntersecting = true) {
    const entry = { isIntersecting } as IntersectionObserverEntry;
    callback([entry], {} as IntersectionObserver);
  }
  it('loads the first page on entry and observes the pagination sentinel', async () => {
    const fixture = await setup();
    expect(facade.load).toHaveBeenCalledOnce();
    expect(observe).toHaveBeenCalled();
    intersect(false);
    expect(facade.load).toHaveBeenCalledOnce();
    intersect();
    expect(facade.load).toHaveBeenCalledTimes(2);
    disconnect.mockClear();
    fixture.destroy();
    expect(disconnect).toHaveBeenCalledOnce();
  });
  it('does not fetch an unseen page when returning to an existing list', async () => {
    state.update((s) => ({ ...s, nextStartIndex: 20 }));
    await setup();
    expect(facade.load).not.toHaveBeenCalled();
  });
  it('pauses automatic pagination during search and supports manual loading and clearing', async () => {
    state.update((s) => ({ ...s, query: 'Ada' }));
    const fixture = await setup();
    intersect();
    expect(facade.load).not.toHaveBeenCalled();
    expect(observe).not.toHaveBeenCalled();
    click(fixture, 'Load more books');
    expect(facade.load).toHaveBeenCalledOnce();
    enter(fixture, 'input[type="search"]', 'Grace');
    expect(facade.search).toHaveBeenCalledWith('Grace');
    click(fixture, 'Clear');
    expect(facade.search).toHaveBeenCalledWith('');
  });
  it.each([
    { loading: true },
    { error: { code: 'FAIL', message: 'Try again' } },
    { nextStartIndex: null },
  ])('stops observing when %j', async (patch) => {
    const fixture = await setup();
    observe.mockClear();
    disconnect.mockClear();
    state.update((s) => ({ ...s, ...patch }));
    await fixture.whenStable();
    expect(observe).not.toHaveBeenCalled();
    expect(disconnect).toHaveBeenCalled();
  });
  it('renders loading, failure, retry, and completed states', async () => {
    const fixture = await setup();
    state.update((s) => ({ ...s, loading: true }));
    await fixture.whenStable();
    expect(text(fixture)).toContain('Loading books…');
    state.update((s) => ({ ...s, loading: false, error: { code: 'FAIL', message: 'Offline' } }));
    await fixture.whenStable();
    expect(text(fixture)).toContain('Offline');
    click(fixture, 'Retry');
    expect(facade.retry).toHaveBeenCalledOnce();
    state.update((s) => ({ ...s, error: null, nextStartIndex: null }));
    await fixture.whenStable();
    expect(text(fixture)).toContain('All available pages loaded.');
  });
  it('distinguishes empty library and empty search results', async () => {
    facade.visibleBooks.set([]);
    const fixture = await setup();
    expect(text(fixture)).toContain('No books available yet.');
    state.update((s) => ({ ...s, query: 'Missing' }));
    await fixture.whenStable();
    expect(text(fixture)).toContain('No loaded books match your search.');
  });
  it('opens create, edit, and delete dialogs from user actions', async () => {
    const fixture = await setup();
    click(fixture, 'Create new book');
    expect(dialogs.editBook).toHaveBeenCalledWith();
    click(fixture, 'Edit');
    expect(dialogs.editBook).toHaveBeenCalledWith(book());
    click(fixture, 'Delete');
    expect(dialogs.deleteBook).toHaveBeenCalledWith(book());
  });
});
