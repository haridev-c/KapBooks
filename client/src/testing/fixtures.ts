import { Book } from '../app/books/data-access/book';
import { Course } from '../app/courses/data-access/course';

export const book = (id = 'b1', overrides: Partial<Book> = {}): Book => ({
  id,
  title: 'Angular Patterns',
  authors: ['Ada Lovelace'],
  publisher: 'Tech Press',
  publishedDate: '2024-02-29',
  ...overrides,
});
export const course = (id = 'c1', overrides: Partial<Course> = {}): Course => ({
  id,
  name: 'Web development',
  description: '',
  bookIds: ['b1'],
  ...overrides,
});
