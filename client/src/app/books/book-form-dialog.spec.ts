import { TestBed } from '@angular/core/testing';
import { DateAdapter } from '@angular/material/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BookFormDialog } from './book-form-dialog';

describe('book editor publication dates and descriptions', () => {
  const book = {
    id: 'one',
    title: 'A book',
    authors: ['An author'],
    publisher: 'A publisher',
    publishedDate: '2024-02-29',
    description: 'First paragraph.\n\nSecond paragraph.',
  };
  const close = vi.fn();

  function editor(data: typeof book | null = book) {
    TestBed.configureTestingModule({
      imports: [BookFormDialog],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: { close } },
      ],
    });
    const fixture = TestBed.createComponent(BookFormDialog);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('round trips an edited date using local calendar components and preserves description', () => {
    const fixture = editor();
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[formControlName="publishedDate"]',
    );
    expect(input.value).toBe('2024-02-29');
    expect(fixture.nativeElement.textContent).not.toContain('Date precision');
    fixture.componentInstance.save();
    expect(close).toHaveBeenCalledWith({
      title: book.title,
      authors: book.authors,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      description: book.description,
    });
  });

  it('rejects partial and impossible typed dates, then accepts a complete leap date', () => {
    const fixture = editor();
    const input: HTMLInputElement = fixture.nativeElement.querySelector(
      '[formControlName="publishedDate"]',
    );
    for (const value of [
      '2024',
      '2024-02',
      '2023-02-29',
      '1900-02-29',
      '2024-04-31',
      '0000-01-01',
      '',
    ]) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      fixture.componentInstance.save();
      expect(close).not.toHaveBeenCalled();
    }
    input.value = '2000-02-29';
    input.dispatchEvent(new Event('input'));
    fixture.componentInstance.save();
    expect(close).toHaveBeenCalledWith(expect.objectContaining({ publishedDate: '2000-02-29' }));
  });

  it('creates a book without a description and opens the calendar', async () => {
    const fixture = editor(null);
    const adapter = fixture.debugElement.injector.get<DateAdapter<Date>>(DateAdapter);
    fixture.componentInstance.form.patchValue({
      title: ' New book ',
      authors: ' A\nB ',
      publisher: ' Publisher ',
      publishedDate: adapter.createDate(2025, 0, 2),
    });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('mat-datepicker-toggle button').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.querySelector('mat-calendar')).not.toBeNull();
    fixture.componentInstance.save();
    expect(close).toHaveBeenCalledWith({
      title: 'New book',
      authors: ['A', 'B'],
      publisher: 'Publisher',
      publishedDate: '2025-01-02',
      description: undefined,
    });
  });
});
