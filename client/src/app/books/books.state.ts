import {
  createActionGroup,
  createFeature,
  createReducer,
  emptyProps,
  on,
  props,
} from '@ngrx/store';
import { Book, BooksFailure, BooksResponse } from './book';

export const booksActions = createActionGroup({
  source: 'Books',
  events: {
    Load: emptyProps(),
    Retry: emptyProps(),
    'Load Page': props<{ startIndex: number }>(),
    'Load Success': props<BooksResponse>(),
    'Load Failure': props<{ error: BooksFailure }>(),
  },
});

export interface BooksState {
  books: Book[];
  loading: boolean;
  error: BooksFailure | null;
  nextStartIndex: number | null;
}

const initialState: BooksState = { books: [], loading: false, error: null, nextStartIndex: 0 };

export const booksFeature = createFeature({
  name: 'books',
  reducer: createReducer(
    initialState,
    on(booksActions.loadPage, (state) => ({ ...state, loading: true, error: null })),
    on(booksActions.loadSuccess, (state, { books, nextStartIndex }) => {
      const seen = new Set(state.books.map((book) => book.id));
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
  ),
});
