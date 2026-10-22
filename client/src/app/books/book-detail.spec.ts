import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { book, course } from '../../testing/fixtures';
import { click, text } from '../../testing/dom';
import { CoursesFacade } from '../courses/courses.facade';
import { LibraryDialogs } from '../shared/library-dialogs';
import { Book } from './book';
import { BookDetail } from './book-detail';
import { BooksFacade } from './books.facade';

async function setup(initial: Book | undefined = book()) {
  const params = new BehaviorSubject(convertToParamMap({ id: 'b1' }));
  const value = new BehaviorSubject<Book | undefined>(initial);
  const book$ = vi.fn(() => value);
  const dialogs = { editBook: vi.fn(), deleteBook: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: BooksFacade, useValue: { book$ } },
      { provide: CoursesFacade, useValue: { usingBook$: () => of([course()]) } },
      { provide: LibraryDialogs, useValue: dialogs },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(BookDetail);
  await fixture.whenStable();
  return { fixture, params, value, book$, dialogs, navigate };
}
describe('BookDetail', () => {
  it('renders metadata, course usage and updates when the route ID changes', async () => {
    const { fixture, params, value, book$ } = await setup();
    expect(text(fixture)).toContain('Angular Patterns');
    expect(text(fixture)).toContain('Web development');
    params.next(convertToParamMap({ id: 'b2' }));
    value.next(book('b2', { title: 'Second' }));
    await fixture.whenStable();
    expect(book$).toHaveBeenLastCalledWith('b2');
    expect(text(fixture)).toContain('Second');
  });
  it('shows an unavailable message for absent or deleted books', async () => {
    const { fixture, value } = await setup();
    value.next(undefined);
    await fixture.whenStable();
    expect(text(fixture)).toContain('Not available in this session');
  });
  it('opens edit and navigates only after the deletion callback runs', async () => {
    const { fixture, dialogs, navigate } = await setup();
    click(fixture, 'Edit book');
    expect(dialogs.editBook).toHaveBeenCalledWith(book());
    click(fixture, 'Delete book');
    expect(navigate).not.toHaveBeenCalled();
    const callback: () => void = dialogs.deleteBook.mock.calls[0][1];
    callback();
    expect(navigate).toHaveBeenCalledWith(['/books']);
  });
});
