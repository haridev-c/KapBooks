import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { map, switchMap } from 'rxjs';
import { BooksFacade } from './books.facade';
import { CoursesFacade } from '../courses/courses.facade';
import { LibraryDialogs } from '../shared/library-dialogs';

@Component({
  selector: 'app-book-detail',
  imports: [RouterLink, MatButtonModule, MatCardModule],
  template: `
    <a mat-button routerLink="/books">Back to Books</a>
    @if (book(); as book) {
      <div class="page-heading">
        <h1>{{ book.title || 'Untitled book' }}</h1>
        <div class="actions">
          <button mat-flat-button (click)="dialogs.editBook(book)">Edit book</button>
          <button mat-stroked-button (click)="remove()">Delete book</button>
        </div>
      </div>
      <mat-card appearance="outlined"
        ><mat-card-content>
          <p>Authors: {{ book.authors.join(', ') || 'Unknown' }}</p>
          <p>Publisher: {{ book.publisher || 'Unknown' }}</p>
          <p>Published date: {{ book.publishedDate || 'Unknown' }}</p>
        </mat-card-content></mat-card
      >
      <h2>Used in courses</h2>
      <ul>
        @for (course of courses(); track course.id) {
          <li>
            <a [routerLink]="['/courses', course.id]">{{ course.name }}</a>
          </li>
        } @empty {
          <li>This book is not used by any course.</li>
        }
      </ul>
    } @else {
      <h1>Not available in this session</h1>
      <p>This book is not loaded or was deleted. Changes reset on refresh.</p>
    }
  `,
})
export class BookDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly booksFacade = inject(BooksFacade);
  private readonly coursesFacade = inject(CoursesFacade);
  protected readonly dialogs = inject(LibraryDialogs);
  private readonly id$ = this.route.paramMap.pipe(map((params) => params.get('id')!));
  protected readonly book = toSignal(this.id$.pipe(switchMap((id) => this.booksFacade.book$(id))));
  protected readonly courses = toSignal(
    this.id$.pipe(switchMap((id) => this.coursesFacade.usingBook$(id))),
    { initialValue: [] },
  );
  protected remove() {
    const book = this.book();
    if (book)
      this.dialogs.deleteBook(book, () => {
        void this.router.navigate(['/books']);
      });
  }
}
