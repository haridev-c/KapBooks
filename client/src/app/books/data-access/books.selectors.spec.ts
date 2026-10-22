import { describe, expect, it } from 'vitest';
import { book } from '../../../testing/fixtures';
import { selectBookById, selectIsSearching, selectVisibleBooks } from './books.selectors';
const books = [book(), book('b2', { title: null, authors: [], publisher: null })];
describe('book selectors', () => {
  it.each(['', '  \n '])('returns all books for blank query %j', (query) => {
    expect(selectVisibleBooks.projector(books, query)).toEqual(books);
    expect(selectIsSearching.projector(query)).toBe(false);
  });
  it.each(['ANGULAR', 'ada', 'press', '  angular \n ADA  press '])(
    'matches across title, authors and publisher for %j',
    (query) => {
      expect(selectVisibleBooks.projector(books, query)).toEqual([books[0]]);
      expect(selectIsSearching.projector(query)).toBe(true);
    },
  );
  it('requires every word and tolerates absent metadata', () => {
    expect(selectVisibleBooks.projector(books, 'Angular missing')).toEqual([]);
  });
  it('looks up an ID or returns undefined', () => {
    expect(selectBookById('b1').projector(books)).toBe(books[0]);
    expect(selectBookById('missing').projector(books)).toBeUndefined();
  });
});
