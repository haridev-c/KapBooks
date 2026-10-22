import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { book, course } from '../../testing/fixtures';
import { BooksFacade } from '../books/data-access/books.facade';
import { CoursesFacade } from '../courses/data-access/courses.facade';
import { LibraryDialogs } from './library-dialogs';

describe('LibraryDialogs', () => {
  const books = { books: signal([book()]), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const courses = {
    courses: signal([course()]),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  let result: Subject<unknown>;
  let open: ReturnType<typeof vi.fn>;
  let dialogs: LibraryDialogs;
  beforeEach(() => {
    vi.clearAllMocks();
    books.books.set([book()]);
    courses.courses.set([]);
    result = new Subject();
    open = vi.fn(() => ({ afterClosed: () => result }));
    TestBed.configureTestingModule({
      providers: [
        { provide: MatDialog, useValue: { open } },
        { provide: BooksFacade, useValue: books },
        { provide: CoursesFacade, useValue: courses },
      ],
    });
    dialogs = TestBed.inject(LibraryDialogs);
  });
  it('creates a book from saved dialog values', async () => {
    await dialogs.editBook();
    const { id, ...value } = book();
    result.next(value);
    expect(books.create).toHaveBeenCalledWith(value);
    expect(books.update).not.toHaveBeenCalled();
    expect(open).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ data: null }),
    );
  });
  it('updates a book with its original ID', async () => {
    const original = book();
    await dialogs.editBook(original);
    const value = { ...original, title: 'Changed' };
    result.next(value);
    expect(books.update).toHaveBeenCalledWith(value);
    expect(books.create).not.toHaveBeenCalled();
  });
  it('creates and edits courses', async () => {
    await dialogs.editCourse();
    const { id, ...value } = course();
    result.next(value);
    expect(courses.create).toHaveBeenCalledWith(value);
    result = new Subject();
    await dialogs.editCourse(course());
    result.next({ ...value, name: 'Changed' });
    expect(courses.update).toHaveBeenCalledWith({ ...value, name: 'Changed', id: 'c1' });
  });
  it('does nothing when an edit dialog is cancelled', async () => {
    await dialogs.editBook(book());
    result.next(undefined);
    await dialogs.editCourse(course());
    result.next(undefined);
    expect(books.update).not.toHaveBeenCalled();
    expect(courses.update).not.toHaveBeenCalled();
    expect(books.create).not.toHaveBeenCalled();
    expect(courses.create).not.toHaveBeenCalled();
  });
  it.each([false, undefined])('does not delete when confirmation returns %j', (value) => {
    dialogs.deleteBook(book());
    result.next(value);
    dialogs.deleteCourse(course());
    result.next(value);
    expect(books.delete).not.toHaveBeenCalled();
    expect(courses.delete).not.toHaveBeenCalled();
  });
  it('deletes an unused book after confirmation and calls back only after removal', () => {
    const done = vi.fn();
    books.delete.mockImplementationOnce(() => books.books.set([]));
    dialogs.deleteBook(book(), done);
    expect(books.delete).not.toHaveBeenCalled();
    result.next(true);
    expect(books.delete).toHaveBeenCalledWith('b1');
    expect(done).toHaveBeenCalledOnce();
  });
  it('does not call back if a confirmed book deletion leaves the record present', () => {
    const done = vi.fn();
    dialogs.deleteBook(book(), done);
    result.next(true);
    expect(done).not.toHaveBeenCalled();
  });
  it('sends referenced books to the blocking effect without opening confirmation', () => {
    courses.courses.set([course()]);
    const done = vi.fn();
    dialogs.deleteBook(book(), done);
    expect(open).not.toHaveBeenCalled();
    expect(books.delete).toHaveBeenCalledWith('b1');
    expect(done).not.toHaveBeenCalled();
  });
  it('confirms course deletion and runs the callback', () => {
    const done = vi.fn();
    dialogs.deleteCourse(course(), done);
    result.next(true);
    expect(courses.delete).toHaveBeenCalledWith('c1');
    expect(done).toHaveBeenCalledOnce();
    expect(books.delete).not.toHaveBeenCalled();
  });
});
