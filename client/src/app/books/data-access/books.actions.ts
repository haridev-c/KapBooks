import { createActionGroup, emptyProps, props } from '@ngrx/store';
import { Book, BooksFailure, BooksResponse } from './book';

export const booksActions = createActionGroup({
  source: 'Books',
  events: {
    Load: emptyProps(),
    Retry: emptyProps(),
    'Load Page': props<{ startIndex: number }>(),
    'Load Success': props<BooksResponse>(),
    'Load Failure': props<{ error: BooksFailure }>(),
    'Search Changed': props<{ query: string }>(),
    Created: props<{ book: Book }>(),
    Updated: props<{ book: Book }>(),
    'Delete Requested': props<{ id: string }>(),
    Deleted: props<{ id: string }>(),
    'Delete Blocked': props<{ courseNames: string[] }>(),
  },
});
