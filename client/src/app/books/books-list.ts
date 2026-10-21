import {
  afterRenderEffect,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { Store } from '@ngrx/store';
import { booksActions, booksFeature } from './books.state';

@Component({
  selector: 'app-books-list',
  templateUrl: './books-list.html',
  styleUrl: './books-list.css',
})
export class BooksList implements OnInit {
  private readonly store = inject(Store);
  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');
  protected readonly state = this.store.selectSignal(booksFeature.selectBooksState);

  constructor() {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          this.store.dispatch(booksActions.load());
        }
      },
      { rootMargin: '0px 0px 300px 0px' },
    );

    afterRenderEffect(() => {
      const { loading, error, nextStartIndex } = this.state();
      observer.disconnect();
      if (!loading && !error && nextStartIndex !== null) {
        // Re-observing after each page also fills a viewport that is still short.
        observer.observe(this.sentinel().nativeElement);
      }
    });
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }

  ngOnInit(): void {
    this.store.dispatch(booksActions.load());
  }

  protected retry(): void {
    this.store.dispatch(booksActions.retry());
  }
}
