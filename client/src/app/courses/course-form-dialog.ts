import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { BooksFacade } from '../books/books.facade';
import { nonBlank } from '../shared/form-validators';
import { Course } from './course';

@Component({
  selector: 'app-course-form-dialog',
  imports: [
    FormField,
    FormRoot,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ course ? 'Edit course' : 'Create course' }}</h2>
    <form [formRoot]="form">
      <mat-dialog-content class="form-fields">
        <p>Changes are kept for this session only.</p>
        <mat-form-field>
          <mat-label>Name</mat-label><input matInput [formField]="form.name" />
          <mat-error>Enter a course name.</mat-error>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Description</mat-label
          ><textarea matInput [formField]="form.description" rows="3"></textarea>
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
          @for (book of readingList(); track book.id; let i = $index) {
            <li>
              <span>{{ book.title }}</span>
              <div class="actions">
                <button
                  mat-button
                  type="button"
                  [disabled]="i === 0"
                  (click)="move(i, -1)"
                  [attr.aria-label]="'Move up ' + book.title"
                >
                  Move up
                </button>
                <button
                  mat-button
                  type="button"
                  [disabled]="i === bookIds().length - 1"
                  (click)="move(i, 1)"
                  [attr.aria-label]="'Move down ' + book.title"
                >
                  Move down
                </button>
                <button
                  mat-button
                  type="button"
                  (click)="remove(book.id)"
                  #removeButton
                  [attr.aria-label]="'Remove ' + book.title"
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
  private readonly injector = inject(Injector);
  private readonly picker = viewChild.required<MatSelect>('picker');
  private readonly removeButtons = viewChildren<unknown, ElementRef<HTMLButtonElement>>(
    'removeButton',
    {
      read: ElementRef,
    },
  );
  private readonly model = signal({
    name: this.course?.name ?? '',
    description: this.course?.description ?? '',
  });
  readonly form = form(this.model, (path) => nonBlank(path.name), {
    submission: { action: async () => this.save() },
  });
  readonly bookIds = signal([...(this.course?.bookIds ?? [])]);
  private readonly booksById = computed(
    () => new Map(this.books.books().map((book) => [book.id, book])),
  );
  readonly readingList = computed(() =>
    this.bookIds().map((id) => ({
      id,
      title: this.booksById().get(id)?.title || 'Untitled book',
    })),
  );
  readonly availableBooks = computed(() => {
    const selected = new Set(this.bookIds());
    return this.books.books().filter((book) => !selected.has(book.id));
  });
  add(id: string) {
    if (id && !this.bookIds().includes(id) && this.booksById().has(id)) {
      this.bookIds.update((ids) => [...ids, id]);
    }
  }
  remove(id: string) {
    const index = this.bookIds().indexOf(id);
    if (index === -1) return;
    this.bookIds.update((ids) => ids.filter((existing) => existing !== id));
    afterNextRender(
      () => {
        const buttons = this.removeButtons();
        const target = buttons[Math.min(index, buttons.length - 1)];
        if (target) target.nativeElement.focus();
        else this.picker().focus();
      },
      { injector: this.injector },
    );
  }
  move(index: number, direction: number) {
    const ids = [...this.bookIds()];
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    this.bookIds.set(ids);
  }
  save() {
    const { name, description } = this.model();
    this.dialog.close({
      name: name.trim(),
      description: description.trim(),
      bookIds: [...this.bookIds()],
    });
  }
}
