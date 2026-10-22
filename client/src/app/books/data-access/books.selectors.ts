import { createSelector } from '@ngrx/store';
import { booksFeature } from './books.state';

export const selectIsSearching = createSelector(
  booksFeature.selectQuery,
  (query) => !!query.trim(),
);
export const selectVisibleBooks = createSelector(
  booksFeature.selectBooks,
  booksFeature.selectQuery,
  (books, query) => {
    const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return books.filter((book) => {
      const text = [book.title, ...book.authors, book.publisher].join(' ').toLocaleLowerCase();
      return words.every((word) => text.includes(word));
    });
  },
);
export const selectBookById = (id: string) =>
  createSelector(booksFeature.selectBooks, (books) => books.find((book) => book.id === id));
