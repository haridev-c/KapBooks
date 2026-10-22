import { createSelector } from '@ngrx/store';
import { booksFeature } from '../../books/data-access/books.state';
import { Book } from '../../books/data-access/book';
import { coursesFeature } from './courses.state';

export const selectCourseById = (id: string) =>
  createSelector(coursesFeature.selectCourses, (courses) =>
    courses.find((course) => course.id === id),
  );
export const selectCourseBooks = (id: string) =>
  createSelector(selectCourseById(id), booksFeature.selectBooks, (course, books) => {
    const byId = new Map(books.map((book) => [book.id, book]));
    return (course?.bookIds ?? [])
      .map((bookId) => byId.get(bookId))
      .filter((book): book is Book => !!book);
  });
export const selectCoursesUsingBook = (id: string) =>
  createSelector(coursesFeature.selectCourses, (courses) =>
    courses.filter((course) => course.bookIds.includes(id)),
  );
