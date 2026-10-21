import { booksActions, booksFeature } from './books.state';

describe('books state', () => {
  const { reducer } = booksFeature;
  const book = { id: 'one', title: 'Book', authors: [], publisher: null, publishedDate: null };

  it('starts empty with the first offset ready to load', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual({
      books: [],
      loading: false,
      error: null,
      nextStartIndex: 0,
    });
  });

  it('appends unique books in first-seen order and advances independently of duplicates', () => {
    const loaded = reducer(
      undefined,
      booksActions.loadSuccess({ books: [book], nextStartIndex: 20 }),
    );
    const second = { ...book, id: 'two' };
    const appended = reducer(
      loaded,
      booksActions.loadSuccess({
        books: [{ ...book, title: 'Changed' }, second, second],
        nextStartIndex: 40,
      }),
    );
    expect(appended.books).toEqual([book, second]);
    const duplicatePage = reducer(
      appended,
      booksActions.loadSuccess({ books: [book], nextStartIndex: 60 }),
    );
    expect(duplicatePage.books).toEqual([book, second]);
    expect(duplicatePage.nextStartIndex).toBe(60);
  });

  it('retains books and offset after failure and clears the error when a retry is accepted', () => {
    const loaded = reducer(
      undefined,
      booksActions.loadSuccess({ books: [book], nextStartIndex: 20 }),
    );
    const error = { code: 'UPSTREAM_FAILURE', message: 'Unable to fetch books.' };
    const failed = reducer(loaded, booksActions.loadFailure({ error }));
    expect(failed).toEqual({ books: [book], loading: false, error, nextStartIndex: 20 });
    expect(reducer(failed, booksActions.loadPage({ startIndex: 20 }))).toEqual({
      books: [book],
      loading: true,
      error: null,
      nextStartIndex: 20,
    });
  });

  it('retains books at exhaustion and exposes the current page state through selectors', () => {
    const loaded = reducer(
      undefined,
      booksActions.loadSuccess({ books: [book], nextStartIndex: 20 }),
    );
    const ended = reducer(loaded, booksActions.loadSuccess({ books: [], nextStartIndex: null }));
    expect(booksFeature.selectBooks({ books: ended })).toEqual([book]);
    expect(booksFeature.selectLoading({ books: ended })).toBe(false);
    expect(booksFeature.selectError({ books: ended })).toBeNull();
    expect(booksFeature.selectNextStartIndex({ books: ended })).toBeNull();
  });
});
