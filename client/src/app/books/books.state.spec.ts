import { booksActions, booksFeature } from './books.state';

describe('books state', () => {
  const { reducer } = booksFeature;
  const book = { id: 'one', title: 'Book', authors: [], publisher: null, publishedDate: null };

  it('starts empty and idle', () => {
    expect(reducer(undefined, { type: 'init' })).toEqual({
      books: [],
      loading: false,
      error: null,
    });
  });

  it('retains existing books on failure and clears errors when retrying', () => {
    const loaded = reducer(undefined, booksActions.loadSuccess({ books: [book] }));
    const error = { code: 'UPSTREAM_FAILURE', message: 'Unable to fetch books.' };
    const failed = reducer(loaded, booksActions.loadFailure({ error }));
    expect(failed).toEqual({ books: [book], loading: false, error });
    expect(reducer(failed, booksActions.load())).toEqual({
      books: [book],
      loading: true,
      error: null,
    });
  });

  it('replaces books on success and exposes books, loading, and error selectors', () => {
    const state = reducer(undefined, booksActions.loadSuccess({ books: [book] }));
    expect(booksFeature.selectBooks({ books: state })).toEqual([book]);
    expect(booksFeature.selectLoading({ books: state })).toBe(false);
    expect(booksFeature.selectError({ books: state })).toBeNull();
    expect(reducer(state, booksActions.loadSuccess({ books: [] })).books).toEqual([]);
  });
});
