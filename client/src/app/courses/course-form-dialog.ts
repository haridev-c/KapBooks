import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { BooksFacade } from '../books/books.facade';
import { nonBlank } from '../shared/form-validators';
import { Course } from './course';

@Component({
  selector: 'app-course-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ course ? 'Edit course' : 'Create course' }}</h2>
    <form [formGroup]="form" (ngSubmit)="save()">
      <mat-dialog-content class="form-fields">
        <p>Changes are kept for this session only.</p>
        <mat-form-field>
          <mat-label>Name</mat-label><input matInput formControlName="name" required />
          <mat-error>Enter a course name.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Description</mat-label
          ><textarea matInput formControlName="description" rows="3"></textarea>
        </mat-form-field>
        <h3>Reading list</h3>
        <p>Select from loaded books. Visit Books to load more or create a book.</p>
        <mat-form-field>
          <mat-label>Add a book</mat-label>
          <mat-select [value]="''" (selectionChange)="add($event.value); picker.value = ''" #picker>
            @for (book of availableBooks(); track book.id) {
              <mat-option [value]="book.id"
                >{{ book.title || 'Untitled book' }} — {{ book.authors.join(', ') }}</mat-option
              >
            }
          </mat-select>
          @if (!availableBooks().length) {
            <mat-hint>No additional loaded books available</mat-hint>
          }
        </mat-form-field>
        @if (!bookIds().length) {
          <p>This course has no books yet.</p>
        }
        <ol class="reading-list" aria-label="Course reading order" aria-live="polite">
          @for (id of bookIds(); track id; let i = $index) {
            <li>
              <span>{{ title(id) }}</span>
              <div class="actions">
                <button
                  mat-button
                  type="button"
                  [disabled]="i === 0"
                  (click)="move(i, -1)"
                  [attr.aria-label]="'Move ' + title(id) + ' up'"
                >
                  Move up
                </button>
                <button
                  mat-button
                  type="button"
                  [disabled]="i === bookIds().length - 1"
                  (click)="move(i, 1)"
                  [attr.aria-label]="'Move ' + title(id) + ' down'"
                >
                  Move down
                </button>
                <button
                  mat-button
                  type="button"
                  (click)="remove(id)"
                  [attr.aria-label]="'Remove ' + title(id)"
                >
                  Remove
                </button>
              </div>
            </li>
          }
        </ol>
      </mat-dialog-content>
      <mat-dialog-actions align="end">
        <button mat-button type="button" [mat-dialog-close]="undefined">Cancel</button>
        <button mat-flat-button type="submit">Save course</button>
      </mat-dialog-actions>
    </form>
  `,
})
export class CourseFormDialog {
  readonly course = inject<Course | null>(MAT_DIALOG_DATA);
  private readonly dialog = inject(MatDialogRef<CourseFormDialog, Omit<Course, 'id'>>);
  private readonly books = inject(BooksFacade);
  readonly form = new FormGroup({
    name: new FormControl(this.course?.name ?? '', { nonNullable: true, validators: [nonBlank] }),
    description: new FormControl(this.course?.description ?? '', { nonNullable: true }),
  });
  readonly bookIds = signal([...(this.course?.bookIds ?? [])]);
  readonly availableBooks = computed(() =>
    this.books.books().filter((book) => !this.bookIds().includes(book.id)),
  );
  title(id: string) {
    return this.books.books().find((book) => book.id === id)?.title || 'Untitled book';
  }
  add(id: string) {
    if (id && !this.bookIds().includes(id) && this.books.books().some((book) => book.id === id)) {
      this.bookIds.update((ids) => [...ids, id]);
    }
  }
  remove(id: string) {
    this.bookIds.update((ids) => ids.filter((existing) => existing !== id));
  }
  move(index: number, direction: number) {
    const ids = [...this.bookIds()];
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.bookIds.set(ids);
  }
  save() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    const { name, description } = this.form.getRawValue();
    this.dialog.close({
      name: name.trim(),
      description: description.trim(),
      bookIds: [...this.bookIds()],
    });
  }
}
