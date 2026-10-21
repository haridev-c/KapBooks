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
  host: {
    class: 'block min-h-screen bg-[#f7f8fa] text-slate-700 font-[Arial,sans-serif]',
  },
  template: `
    <main class="mx-auto max-w-[1100px] px-5 py-8">
      <h1 class="m-0 text-[2rem] font-bold">Books</h1>
      <p class="mt-2 mb-8">Kaplan Test Prep</p>

      <ul
        class="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,24rem),1fr))] gap-4 p-0"
        aria-label="Books"
        [attr.aria-busy]="state().loading"
      >
        @for (book of state().books; track book.id) {
          <li
            class="rounded-md border border-l-4 border-slate-200 border-l-amber-500 bg-white p-5 [overflow-wrap:anywhere]"
          >
            <h2 class="mt-0 mb-3 text-lg font-semibold">{{ book.title || 'Untitled book' }}</h2>
            <p class="my-1.5">Authors: {{ book.authors.join(', ') || 'Unknown' }}</p>
            <p class="my-1.5">Publisher: {{ book.publisher || 'Unknown' }}</p>
            <p class="my-1.5">Published date: {{ book.publishedDate || 'Unknown' }}</p>
          </li>
        }
      </ul>

      <div class="py-6" aria-live="polite">
        @if (state().loading) {
          <p>Loading books…</p>
        }
        @if (state().error; as error) {
          <p>{{ error.message }}</p>
          <button
            class="mt-3 cursor-pointer rounded bg-blue-700 px-4 py-2 text-white focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-blue-700"
            type="button"
            (click)="retry()"
          >
            Retry
          </button>
        }
        @if (state().nextStartIndex === null) {
          <p>{{ state().books.length ? 'All books loaded.' : 'No books found.' }}</p>
        }
      </div>
      <div #sentinel class="h-px" aria-hidden="true"></div>
    </main>
  `,
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
