import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  DateAdapter,
  MAT_NATIVE_DATE_FORMATS,
  provideNativeDateAdapter,
} from '@angular/material/core';
import { PublicationDateAdapter } from '../shared/publication-date-adapter';
import { Book } from './book';
import { authorsRequired, nonBlank } from '../shared/form-validators';

@Component({
  selector: 'app-book-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
  ],
  providers: [
    provideNativeDateAdapter({
      ...MAT_NATIVE_DATE_FORMATS,
      display: { ...MAT_NATIVE_DATE_FORMATS.display, dateInput: 'input' },
    }),
    { provide: DateAdapter, useClass: PublicationDateAdapter },
  ],
  template: `
    <h2 mat-dialog-title>{{ book ? 'Edit book' : 'Create new book' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="form-fields">
        <p>
          Changes are kept for this session only. Description is optional; all other fields are
          required.
        </p>
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
          <mat-label>Published date</mat-label>
          <input
            matInput
            formControlName="publishedDate"
            [matDatepicker]="picker"
            placeholder="YYYY-MM-DD"
            [min]="minDate"
            [max]="maxDate"
            required
          />
          <mat-datepicker-toggle matIconSuffix [for]="picker" />
          <mat-datepicker #picker startView="multi-year" />
          <mat-hint>YYYY-MM-DD</mat-hint>
          <mat-error>Choose a valid date or enter YYYY-MM-DD.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Description (optional)</mat-label>
          <textarea matInput formControlName="description" rows="5"></textarea>
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
  private readonly dates = inject<DateAdapter<Date>>(DateAdapter);
  readonly minDate = this.dates.createDate(1, 0, 1);
  readonly maxDate = this.dates.createDate(9999, 11, 31);
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
    publishedDate: new FormControl<Date | null>(this.dates.parse(this.book?.publishedDate, null), {
      validators: [Validators.required],
    }),
    description: new FormControl(this.book?.description ?? '', { nonNullable: true }),
  });

  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { title, authors, publisher, publishedDate, description } = this.form.getRawValue();
    this.dialog.close({
      title: title.trim(),
      authors: authors
        .split('\n')
        .map((author) => author.trim())
        .filter(Boolean),
      publisher: publisher.trim(),
      publishedDate: this.dates.format(publishedDate!, 'input'),
      description: description.trim() || undefined,
    });
  }
}
