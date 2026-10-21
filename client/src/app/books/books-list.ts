import {
  afterRenderEffect,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  OnInit,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BookCard } from './book-card';
import { BooksFacade } from './books.facade';
import { LibraryDialogs } from '../shared/library-dialogs';

@Component({
  selector: 'app-books-list',
  imports: [BookCard, MatButtonModule, MatFormFieldModule, MatInputModule, MatProgressBarModule],
  templateUrl: './books-list.html',
})
export class BooksList implements OnInit {
  protected readonly books = inject(BooksFacade);
  protected readonly dialogs = inject(LibraryDialogs);
  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');

  constructor() {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !this.books.searching())
          this.books.load();
      },
      { rootMargin: '0px 0px 300px 0px' },
    );
    afterRenderEffect(() => {
      const { loading, error, nextStartIndex } = this.books.state();
      observer.disconnect();
      if (!this.books.searching() && !loading && !error && nextStartIndex !== null) {
        observer.observe(this.sentinel().nativeElement);
      }
    });
    inject(DestroyRef).onDestroy(() => observer.disconnect());
  }
  ngOnInit() {
    // Returning to the list should not fetch an unseen page while a search is active.
    if (!this.books.searching() && this.books.state().nextStartIndex === 0) this.books.load();
  }
}
