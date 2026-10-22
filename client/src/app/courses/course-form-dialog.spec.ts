import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { describe, expect, it, vi } from 'vitest';
import { book, course } from '../../testing/fixtures';
import { click, element } from '../../testing/dom';
import { BooksFacade } from '../books/books.facade';
import { Course } from './course';
import { CourseFormDialog } from './course-form-dialog';

async function setup(value: Course | null = null) {
  const close = vi.fn();
  const books = signal([book(), book('b2'), book('b3')]);
  TestBed.configureTestingModule({
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: value },
      { provide: MatDialogRef, useValue: { close } },
      { provide: BooksFacade, useValue: { books } },
    ],
  });
  const fixture = TestBed.createComponent(CourseFormDialog);
  await fixture.whenStable();
  return { fixture, close, component: fixture.componentInstance, books };
}
describe('CourseFormDialog', () => {
  it('prefills edits and offers only unselected books', async () => {
    const { component } = await setup(course());
    expect(component.form.name().value()).toBe('Web development');
    expect(component.availableBooks().map((b) => b.id)).toEqual(['b2', 'b3']);
  });
  it('appends valid books once and rejects empty or unknown IDs', async () => {
    const { component } = await setup();
    component.add('b1');
    component.add('b1');
    component.add('');
    component.add('missing');
    component.add('b2');
    expect(component.bookIds()).toEqual(['b1', 'b2']);
    expect(component.availableBooks().map((b) => b.id)).toEqual(['b3']);
  });
  it('reorders within boundaries and saves normalized fields in reading order', async () => {
    const original = course('c1', { bookIds: ['b1', 'b2', 'b3'] });
    const { component, fixture, close } = await setup(original);
    component.move(0, -1);
    component.move(2, 1);
    expect(component.bookIds()).toEqual(original.bookIds);
    component.move(0, 1);
    component.move(2, -1);
    expect(component.bookIds()).toEqual(['b2', 'b3', 'b1']);
    component.form.name().value.set('  New name ');
    component.form.description().value.set(' Description ');
    fixture.detectChanges();
    click(fixture, 'Save course');
    await fixture.whenStable();
    expect(close).toHaveBeenCalledWith({
      name: 'New name',
      description: 'Description',
      bookIds: ['b2', 'b3', 'b1'],
    });
    expect(original.bookIds).toEqual(['b1', 'b2', 'b3']);
  });
  it.each(['', ' \n '])('rejects a blank name %j', async (value) => {
    const { fixture, component, close } = await setup();
    component.form.name().value.set(value);
    fixture.detectChanges();
    click(fixture, 'Save course');
    await fixture.whenStable();
    expect(component.form.name().invalid()).toBe(true);
    expect(close).not.toHaveBeenCalled();
  });
  it('removes a book, restores its availability and focuses the next remove button', async () => {
    const { fixture, component } = await setup(course('c1', { bookIds: ['b1', 'b2'] }));
    element<HTMLButtonElement>(fixture, 'button[aria-label="Remove Angular Patterns"]').click();
    await fixture.whenStable();
    expect(component.bookIds()).toEqual(['b2']);
    expect(component.availableBooks().map((b) => b.id)).toContain('b1');
    expect(document.activeElement).toBe(
      element(fixture, 'button[aria-label="Remove Angular Patterns"]'),
    );
  });
  it('focuses the picker when the final book is removed and ignores unknown removals', async () => {
    const { fixture, component } = await setup(course());
    component.remove('missing');
    expect(component.bookIds()).toEqual(['b1']);
    click(fixture, 'Remove');
    await fixture.whenStable();
    expect(component.bookIds()).toEqual([]);
    expect(document.activeElement).toBe(element(fixture, 'mat-select'));
  });
  it('cancels without changing the original reading list', async () => {
    const original = course();
    const { fixture, component, close } = await setup(original);
    component.add('b2');
    click(fixture, 'Cancel');
    expect(close).toHaveBeenCalledWith(undefined);
    expect(original.bookIds).toEqual(['b1']);
  });
});
