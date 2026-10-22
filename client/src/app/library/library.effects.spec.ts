import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { provideEffects } from '@ngrx/effects';
import { provideStore, Store } from '@ngrx/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { book, course } from '../../testing/fixtures';
import { booksActions } from '../books/data-access/books.actions';
import { booksFeature } from '../books/data-access/books.state';
import { coursesActions } from '../courses/data-access/courses.actions';
import { coursesFeature } from '../courses/data-access/courses.state';
import { LibraryEffects } from './library.effects';

describe('library deletion and feedback', () => {
  let store: Store;
  let open: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    open = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideStore({ books: booksFeature.reducer, courses: coursesFeature.reducer }),
        provideEffects(LibraryEffects),
        { provide: MatSnackBar, useValue: { open } },
      ],
    });
    store = TestBed.inject(Store);
    store.dispatch(booksActions.created({ book: book() }));
    open.mockClear();
  });
  it('deletes unreferenced books', () => {
    store.dispatch(booksActions.deleteRequested({ id: 'b1' }));
    expect(store.selectSignal(booksFeature.selectBooks)()).toEqual([]);
    expect(open).toHaveBeenCalledWith('Book deleted. Changes last until refresh.', 'Dismiss', {
      duration: 4500,
    });
  });
  it('blocks deletion and reports every referencing course', () => {
    store.dispatch(coursesActions.created({ course: course('c1', { name: 'First' }) }));
    store.dispatch(coursesActions.created({ course: course('c2', { name: 'Second' }) }));
    open.mockClear();
    store.dispatch(booksActions.deleteRequested({ id: 'b1' }));
    expect(store.selectSignal(booksFeature.selectBooks)()).toEqual([book()]);
    expect(open).toHaveBeenCalledExactlyOnceWith(
      'Cannot delete: used by Second, First. Remove the book from these courses first.',
      'Dismiss',
    );
  });
  it('deleting a course preserves its books and permits subsequent book deletion', () => {
    store.dispatch(coursesActions.created({ course: course() }));
    store.dispatch(coursesActions.deleted({ id: 'c1' }));
    expect(store.selectSignal(booksFeature.selectBooks)()).toEqual([book()]);
    store.dispatch(booksActions.deleteRequested({ id: 'b1' }));
    expect(store.selectSignal(booksFeature.selectBooks)()).toEqual([]);
  });
  it.each([
    [booksActions.created({ book: book() }), 'Book saved.'],
    [booksActions.updated({ book: book() }), 'Book saved.'],
    [coursesActions.created({ course: course() }), 'Course saved.'],
    [coursesActions.updated({ course: course() }), 'Course saved.'],
    [coursesActions.deleted({ id: 'c1' }), 'Course deleted.'],
  ])('reports mutation feedback for $0.type', (action, message) => {
    store.dispatch(action);
    expect(open).toHaveBeenLastCalledWith(`${message} Changes last until refresh.`, 'Dismiss', {
      duration: 4500,
    });
  });
});
