import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Book } from '../books/book';
import { BookFormDialog } from '../books/book-form-dialog';
import { BooksFacade } from '../books/books.facade';
import { Course } from '../courses/course';
import { CourseFormDialog } from '../courses/course-form-dialog';
import { CoursesFacade } from '../courses/courses.facade';
import { ConfirmDialog, ConfirmDialogData } from './confirm-dialog';

@Injectable({ providedIn: 'root' })
export class LibraryDialogs {
  private readonly dialog = inject(MatDialog);
  private readonly books = inject(BooksFacade);
  private readonly courses = inject(CoursesFacade);
  private readonly formSize = { width: '640px', maxWidth: 'calc(100vw - 32px)' };

  editBook(book: Book | null = null) {
    this.dialog
      .open<BookFormDialog, Book | null, Omit<Book, 'id'>>(BookFormDialog, {
        ...this.formSize,
        data: book,
      })
      .afterClosed()
      .subscribe((value) => {
        if (value) book ? this.books.update({ ...value, id: book.id }) : this.books.create(value);
      });
  }
  editCourse(course: Course | null = null) {
    this.dialog
      .open<CourseFormDialog, Course | null, Omit<Course, 'id'>>(CourseFormDialog, {
        ...this.formSize,
        data: course,
      })
      .afterClosed()
      .subscribe((value) => {
        if (value)
          course ? this.courses.update({ ...value, id: course.id }) : this.courses.create(value);
      });
  }
  deleteBook(book: Book, onDeleted?: () => void) {
    const usedBy = this.courses.courses().filter((course) => course.bookIds.includes(book.id));
    if (usedBy.length) {
      this.books.delete(book.id); // The effect reports every blocking course without a destructive prompt.
      return;
    }
    this.confirm(
      {
        title: 'Delete book?',
        message: `Delete “${book.title || 'Untitled book'}” for this session?`,
        confirmLabel: 'Delete book',
      },
      () => {
        this.books.delete(book.id);
        if (!this.books.books().some((existing) => existing.id === book.id)) onDeleted?.();
      },
    );
  }
  deleteCourse(course: Course, onDeleted?: () => void) {
    this.confirm(
      {
        title: 'Delete course?',
        message: `Delete “${course.name}” for this session? Its books will remain.`,
        confirmLabel: 'Delete course',
      },
      () => {
        this.courses.delete(course.id);
        onDeleted?.();
      },
    );
  }
  private confirm(data: ConfirmDialogData, confirmed: () => void) {
    this.dialog
      .open<ConfirmDialog, ConfirmDialogData, boolean>(ConfirmDialog, {
        width: '480px',
        maxWidth: 'calc(100vw - 32px)',
        data,
      })
      .afterClosed()
      .subscribe((result) => {
        if (result) confirmed();
      });
  }
}
