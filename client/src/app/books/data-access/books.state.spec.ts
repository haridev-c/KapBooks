import { describe, expect, it } from 'vitest';
import { book } from '../../../testing/fixtures';
import { booksActions as a, booksFeature } from './books.state';
const reduce = booksFeature.reducer;
const initial = () => reduce(undefined, { type: 'init' });
const error = { code: 'OFFLINE', message: 'Offline' };
describe('books reducer', () => {
  it('starts empty with the first page available', () => {
    expect(initial()).toEqual({
      books: [],
      loading: false,
      error: null,
      nextStartIndex: 0,
      query: '',
      deletedIds: [],
    });
  });
  it('starts loading and clears previous errors', () => {
    expect(reduce({ ...initial(), error }, a.loadPage({ startIndex: 0 }))).toMatchObject({
      loading: true,
      error: null,
    });
  });
  it('appends unique records while retaining local edits and previous state', () => {
    const edited = book('b1', { title: 'Local edit' });
    const state = { ...initial(), books: [edited], loading: true, error };
    expect(
      reduce(state, a.loadSuccess({ books: [book(), book('b2'), book('b2')], nextStartIndex: 20 })),
    ).toMatchObject({
      books: [edited, book('b2')],
      nextStartIndex: 20,
      loading: false,
      error: null,
    });
    expect(state.books).toEqual([edited]);
  });
  it('does not resurrect deleted books or duplicate deletion markers', () => {
    let state = reduce({ ...initial(), books: [book()] }, a.deleted({ id: 'b1' }));
    state = reduce(state, a.deleted({ id: 'b1' }));
    state = reduce(state, a.loadSuccess({ books: [book(), book('b2')], nextStartIndex: null }));
    expect(state.books).toEqual([book('b2')]);
    expect(state.deletedIds).toEqual(['b1']);
    expect(state.nextStartIndex).toBeNull();
  });
  it('preserves books and the page index on failure', () => {
    const state = { ...initial(), books: [book()], nextStartIndex: 20, loading: true };
    expect(reduce(state, a.loadFailure({ error }))).toEqual({ ...state, loading: false, error });
  });
  it('creates at the front, updates only matching records, and stores the query', () => {
    let state = reduce(initial(), a.created({ book: book() }));
    state = reduce(state, a.created({ book: book('b2') }));
    const edited = book('b1', { title: 'Edited' });
    state = reduce(state, a.updated({ book: edited }));
    expect(state.books).toEqual([book('b2'), edited]);
    expect(reduce(state, a.updated({ book: book('missing') })).books).toEqual(state.books);
    expect(reduce(state, a.searchChanged({ query: ' Ada ' })).query).toBe(' Ada ');
  });
});
