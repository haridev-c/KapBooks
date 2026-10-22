import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Book } from '../../data-access/book';

@Component({
  selector: 'app-book-card',
  imports: [RouterLink, MatCardModule, MatButtonModule],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header
        ><mat-card-title
          ><a [routerLink]="['/books', book().id]">{{
            book().title || 'Untitled book'
          }}</a></mat-card-title
        ></mat-card-header
      >
      <mat-card-content>
        <p>Authors: {{ book().authors.join(', ') || 'Unknown' }}</p>
        <p>Publisher: {{ book().publisher || 'Unknown' }}</p>
        <p>Published date: {{ book().publishedDate || 'Unknown' }}</p>
      </mat-card-content>
      <mat-card-actions>
        <button
          mat-button
          (click)="edit.emit(book())"
          [attr.aria-label]="'Edit ' + (book().title || 'book')"
        >
          Edit
        </button>
        <button
          mat-button
          (click)="remove.emit(book())"
          [attr.aria-label]="'Delete ' + (book().title || 'book')"
        >
          Delete
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    :host,
    mat-card {
      display: block;
      height: 100%;
    }
    mat-card {
      display: flex;
    }
    mat-card-content {
      flex: 1;
    }
    a {
      color: inherit;
    }
  `,
})
export class BookCard {
  readonly book = input.required<Book>();
  readonly edit = output<Book>();
  readonly remove = output<Book>();
}
