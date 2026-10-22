import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { book } from '../../testing/fixtures';
import { click, element, text } from '../../testing/dom';
import { BookCard } from './book-card';
describe('BookCard', () => {
  it('renders metadata, links to details and emits the book on edit and delete', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(BookCard);
    const value = book();
    fixture.componentRef.setInput('book', value);
    await fixture.whenStable();
    expect(text(fixture)).toContain('Ada Lovelace');
    expect(text(fixture)).toContain('Tech Press');
    expect(text(fixture)).toContain('2024-02-29');
    expect(element(fixture, 'a').getAttribute('href')).toBe('/books/b1');
    const edit = vi.fn();
    const remove = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.remove.subscribe(remove);
    click(fixture, 'Edit');
    click(fixture, 'Delete');
    expect(edit).toHaveBeenCalledWith(value);
    expect(remove).toHaveBeenCalledWith(value);
  });
  it('renders fallbacks and accessible action labels for missing metadata', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(BookCard);
    fixture.componentRef.setInput(
      'book',
      book('b1', { title: null, authors: [], publisher: null, publishedDate: null }),
    );
    await fixture.whenStable();
    expect(text(fixture)).toContain('Untitled book');
    expect(text(fixture)).toContain('Authors: Unknown');
    expect(text(fixture)).toContain('Publisher: Unknown');
    expect(text(fixture)).toContain('Published date: Unknown');
    expect(element(fixture, 'button').getAttribute('aria-label')).toBe('Edit book');
  });
});
