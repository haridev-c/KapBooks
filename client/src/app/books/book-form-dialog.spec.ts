import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { book } from '../../testing/fixtures';
import { click, element, enter } from '../../testing/dom';
import { BookFormDialog } from './book-form-dialog';
import { Book } from './book';

async function setup(value: Book | null = null) {
  const close = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: value },
      { provide: MatDialogRef, useValue: { close } },
    ],
  });
  const fixture = TestBed.createComponent(BookFormDialog);
  await fixture.whenStable();
  return { fixture, close };
}
describe('BookFormDialog', () => {
  it('prefills edit fields without mutating the original book', async () => {
    const original = book();
    const { fixture } = await setup(original);
    expect(element<HTMLInputElement>(fixture, 'input').value).toBe(original.title);
    expect(element<HTMLTextAreaElement>(fixture, 'textarea').value).toBe('Ada Lovelace');
    enter(fixture, 'input', 'Changed');
    expect(original.title).toBe('Angular Patterns');
  });
  it.each(['', ' \n '])('rejects blank required text %j', async (value) => {
    const { fixture, close } = await setup(book());
    fixture.componentInstance.form.title().value.set(value);
    fixture.componentInstance.form.authors().value.set(value);
    fixture.componentInstance.form.publisher().value.set(value);
    fixture.detectChanges();
    click(fixture, 'Save book');
    await fixture.whenStable();
    expect(fixture.componentInstance.form.title().invalid()).toBe(true);
    expect(fixture.componentInstance.form.authors().invalid()).toBe(true);
    expect(fixture.componentInstance.form.publisher().invalid()).toBe(true);
    expect(close).not.toHaveBeenCalled();
  });
  it.each(['', '2023-02-29', '2024-2-01'])(
    'prevents submission with invalid date %j',
    async (value) => {
      const { fixture, close } = await setup(book());
      enter(fixture, 'input[placeholder="YYYY-MM-DD"]', value);
      click(fixture, 'Save book');
      await fixture.whenStable();
      expect(close).not.toHaveBeenCalled();
    },
  );
  it('normalizes text and author lines, formats the date, and permits an empty description', async () => {
    const { fixture, close } = await setup(book());
    const form = fixture.componentInstance.form;
    form.title().value.set('  Revised  ');
    form.authors().value.set(' Ada \n\n Grace  \n ');
    form.publisher().value.set(' Press ');
    form.description().value.set('  ');
    fixture.detectChanges();
    click(fixture, 'Save book');
    await fixture.whenStable();
    expect(close).toHaveBeenCalledExactlyOnceWith({
      title: 'Revised',
      authors: ['Ada', 'Grace'],
      publisher: 'Press',
      publishedDate: '2024-02-29',
      description: undefined,
    });
  });
  it('cancels without a saved value', async () => {
    const { fixture, close } = await setup();
    click(fixture, 'Cancel');
    expect(close).toHaveBeenCalledWith(undefined);
  });
});
