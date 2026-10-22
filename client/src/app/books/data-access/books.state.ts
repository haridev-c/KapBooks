import { createFeature, createReducer, on } from '@ngrx/store';
import { Book, BooksFailure } from './book';
import { booksActions } from './books.actions';

export { booksActions } from './books.actions';

export interface BooksState {
  books: Book[];
  loading: boolean;
  error: BooksFailure | null;
  nextStartIndex: number | null;
  query: string;
  deletedIds: string[];
}

const initialState: BooksState = {
  books: [],
  loading: false,
  error: null,
  nextStartIndex: 0,
  query: '',
  deletedIds: [],
};

export const booksFeature = createFeature({
  name: 'books',
  reducer: createReducer(
    initialState,
    on(booksActions.loadPage, (state) => ({ ...state, loading: true, error: null })),
    on(booksActions.loadSuccess, (state, { books, nextStartIndex }) => {
      // First-seen records retain local edits. Tombstones prevent deleted records returning.
      const seen = new Set([...state.books.map((book) => book.id), ...state.deletedIds]);
      return {
        ...state,
        books: [
          ...state.books,
          ...books.filter((book) => {
            if (seen.has(book.id)) return false;
            seen.add(book.id);
            return true;
          }),
        ],
        nextStartIndex,
        loading: false,
        error: null,
      };
    }),
    on(booksActions.loadFailure, (state, { error }) => ({ ...state, loading: false, error })),
    on(booksActions.searchChanged, (state, { query }) => ({ ...state, query })),
    on(booksActions.created, (state, { book }) => ({ ...state, books: [book, ...state.books] })),
    on(booksActions.updated, (state, { book }) => ({
      ...state,
      books: state.books.map((existing) => (existing.id === book.id ? book : existing)),
    })),
    on(booksActions.deleted, (state, { id }) => ({
      ...state,
      books: state.books.filter((book) => book.id !== id),
      deletedIds: [...new Set([...state.deletedIds, id])],
    })),
  ),
});
