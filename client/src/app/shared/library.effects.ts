import { inject, Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import { map, tap, withLatestFrom } from 'rxjs';
import { booksActions } from '../books/books.actions';
import { coursesActions } from '../courses/courses.actions';
import { coursesFeature } from '../courses/courses.state';

@Injectable()
export class LibraryEffects {
  private readonly actions$ = inject(Actions);
  private readonly store = inject(Store);
  private readonly snackbar = inject(MatSnackBar);

  // Enforce the cross-feature relationship at deletion time, not only in the UI.
  readonly deleteBook$ = createEffect(() =>
    this.actions$.pipe(
      ofType(booksActions.deleteRequested),
      withLatestFrom(this.store.select(coursesFeature.selectCourses)),
      map(([{ id }, courses]) => {
        const courseNames = courses
          .filter((course) => course.bookIds.includes(id))
          .map((course) => course.name);
        return courseNames.length
          ? booksActions.deleteBlocked({ courseNames })
          : booksActions.deleted({ id });
      }),
    ),
  );

  readonly blocked$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(booksActions.deleteBlocked),
        tap(({ courseNames }) =>
          this.snackbar.open(
            `Cannot delete: used by ${courseNames.join(', ')}. Remove the book from these courses first.`,
            'Dismiss',
          ),
        ),
      ),
    { dispatch: false },
  );

  readonly feedback$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          booksActions.created,
          booksActions.updated,
          booksActions.deleted,
          coursesActions.created,
          coursesActions.updated,
          coursesActions.deleted,
        ),
        tap((action) => {
          const item = action.type.startsWith('[Books]') ? 'Book' : 'Course';
          const verb = action.type.endsWith('Deleted') ? 'deleted' : 'saved';
          this.snackbar.open(`${item} ${verb}. Changes last until refresh.`, 'Dismiss', {
            duration: 4500,
          });
        }),
      ),
    { dispatch: false },
  );
}
