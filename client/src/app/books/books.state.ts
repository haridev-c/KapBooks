import {
  createActionGroup,
  createFeature,
  createReducer,
  emptyProps,
  on,
  props,
} from '@ngrx/store';
import { Book, BooksFailure } from './book';

export const booksActions = createActionGroup({
  source: 'Books',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ books: Book[] }>(),
    'Load Failure': props<{ error: BooksFailure }>(),
  },
});

export interface BooksState {
  books: Book[];
  loading: boolean;
  error: BooksFailure | null;
}

const initialState: BooksState = { books: [], loading: false, error: null };

export const booksFeature = createFeature({
  name: 'books',
  reducer: createReducer(
    initialState,
    on(booksActions.load, (state) => ({ ...state, loading: true, error: null })),
    on(booksActions.loadSuccess, (state, { books }) => ({
      ...state,
      books,
      loading: false,
      error: null,
    })),
    on(booksActions.loadFailure, (state, { error }) => ({ ...state, loading: false, error })),
  ),
});
