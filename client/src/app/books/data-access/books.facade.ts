import { inject, Service } from '@angular/core';
import { Store } from '@ngrx/store';
import { Book } from './book';
import { booksActions } from './books.actions';
import { booksFeature } from './books.state';
import { selectBookById, selectIsSearching, selectVisibleBooks } from './books.selectors';

@Service()
export class BooksFacade {
  private readonly store = inject(Store);
  readonly state = this.store.selectSignal(booksFeature.selectBooksState);
  readonly books = this.store.selectSignal(booksFeature.selectBooks);
  readonly visibleBooks = this.store.selectSignal(selectVisibleBooks);
  readonly searching = this.store.selectSignal(selectIsSearching);
  book$(id: string) {
    return this.store.select(selectBookById(id));
  }
  load() {
    this.store.dispatch(booksActions.load());
  }
  retry() {
    this.store.dispatch(booksActions.retry());
  }
  search(query: string) {
    this.store.dispatch(booksActions.searchChanged({ query }));
  }
  create(value: Omit<Book, 'id'>) {
    this.store.dispatch(
      booksActions.created({ book: { ...value, id: `local-${crypto.randomUUID()}` } }),
    );
  }
  update(book: Book) {
    this.store.dispatch(booksActions.updated({ book }));
  }
  delete(id: string) {
    this.store.dispatch(booksActions.deleteRequested({ id }));
  }
}
