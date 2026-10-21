import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Book } from './book';
import {
  authorsRequired,
  DatePrecision,
  nonBlank,
  validPublishedDate,
} from '../shared/form-validators';

@Component({
  selector: 'app-book-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ book ? 'Edit book' : 'Create new book' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="form-fields">
        <p>Changes are kept for this session only. All fields are required.</p>
        <mat-form-field>
          <mat-label>Title</mat-label><input matInput formControlName="title" required />
          <mat-error>Enter a title.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Authors</mat-label
          ><textarea matInput formControlName="authors" rows="3" required></textarea>
          <mat-hint>One author per line</mat-hint><mat-error>Enter at least one author.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Publisher</mat-label><input matInput formControlName="publisher" required />
          <mat-error>Enter a publisher.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Date precision</mat-label>
          <mat-select formControlName="precision">
            <mat-option value="year">Year</mat-option>
            <mat-option value="month">Month</mat-option>
            <mat-option value="day">Day</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Published date</mat-label>
          <input matInput formControlName="publishedDate" [placeholder]="dateExample()" required />
          <mat-hint>{{ dateExample() }}</mat-hint>
          <mat-error>Enter a valid date as {{ dateExample() }}.</mat-error>
        </mat-form-field>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Cancel</button>
        <button mat-flat-button type="submit">Save book</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class BookFormDialog {
  readonly book = inject<Book | null>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<BookFormDialog, Omit<Book, 'id'>>);
  readonly form = new FormGroup({
    title: new FormControl(this.book?.title ?? '', { nonNullable: true, validators: [nonBlank] }),
    authors: new FormControl(this.book?.authors.join('\n') ?? '', {
      nonNullable: true,
      validators: [authorsRequired],
    }),
    publisher: new FormControl(this.book?.publisher ?? '', {
      nonNullable: true,
      validators: [nonBlank],
    }),
    precision: new FormControl<DatePrecision>(this.initialPrecision(), { nonNullable: true }),
    publishedDate: new FormControl(this.book?.publishedDate ?? '', { nonNullable: true }),
  });

  constructor() {
    const { precision, publishedDate } = this.form.controls;
    publishedDate.addValidators((control) =>
      validPublishedDate(control.value.trim(), precision.value) ? null : { date: true },
    );
    publishedDate.updateValueAndValidity();
    precision.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => publishedDate.updateValueAndValidity());
  }
  private initialPrecision(): DatePrecision {
    const length = this.book?.publishedDate?.length;
    return length === 4 ? 'year' : length === 7 ? 'month' : 'day';
  }
  dateExample() {
    return { year: 'YYYY', month: 'YYYY-MM', day: 'YYYY-MM-DD' }[
      this.form.controls.precision.value
    ];
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { title, authors, publisher, publishedDate } = this.form.getRawValue();
    this.dialog.close({
      title: title.trim(),
      authors: authors
        .split('\n')
        .map((author) => author.trim())
        .filter(Boolean),
      publisher: publisher.trim(),
      publishedDate: publishedDate.trim(),
    });
  }
}
