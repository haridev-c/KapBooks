import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map, of, tap } from 'rxjs';
import { BooksFailure } from './book';
import { BooksService } from './books.service';
import { booksActions } from './books.state';

function loadFailure(error: unknown): BooksFailure {
  if (error instanceof HttpErrorResponse) {
    const failure = error.error?.error;
    if (typeof failure?.code === 'string' && typeof failure?.message === 'string') {
      return { code: failure.code, message: failure.message };
    }
  }
  return { code: 'LOAD_FAILED', message: 'Unable to load books. Please try again.' };
}

@Injectable()
export class BooksEffects {
  private readonly actions$ = inject(Actions);
  private readonly booksService = inject(BooksService);

  readonly load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(booksActions.load),
      exhaustMap(() =>
        this.booksService.getBooks().pipe(
          map(({ books }) => booksActions.loadSuccess({ books })),
          catchError((error: unknown) =>
            of(booksActions.loadFailure({ error: loadFailure(error) })),
          ),
        ),
      ),
    ),
  );

  readonly logSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(booksActions.loadSuccess),
        tap(({ books }) => console.log('Books loaded:', books)),
      ),
    { dispatch: false },
  );

  readonly logFailure$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(booksActions.loadFailure),
        tap(({ error }) => console.error('Books load failed:', error.message)),
      ),
    { dispatch: false },
  );
}
