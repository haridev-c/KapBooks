import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { book, course } from '../../../../testing/fixtures';
import { click, text } from '../../../../testing/dom';
import { LibraryDialogs } from '../../../library/library-dialogs';
import { Course } from '../../data-access/course';
import { CourseDetail } from './course-detail';
import { CoursesFacade } from '../../data-access/courses.facade';

async function setup() {
  const params = new BehaviorSubject(convertToParamMap({ id: 'c1' }));
  const value = new BehaviorSubject<Course | undefined>(course());
  const books = new BehaviorSubject([
    book('b2', { title: 'Second' }),
    book('b1', { title: 'First' }),
  ]);
  const course$ = vi.fn(() => value);
  const dialogs = { editCourse: vi.fn(), deleteCourse: vi.fn() };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: params } },
      { provide: CoursesFacade, useValue: { course$, books$: () => books } },
      { provide: LibraryDialogs, useValue: dialogs },
    ],
  });
  const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture = TestBed.createComponent(CourseDetail);
  await fixture.whenStable();
  return { fixture, params, value, books, course$, dialogs, navigate };
}
describe('CourseDetail', () => {
  it('renders the reading list in order and reacts to route changes', async () => {
    const { fixture, params, value, course$ } = await setup();
    const root: HTMLElement = fixture.nativeElement;
    expect([...root.querySelectorAll('ol a')].map((a) => a.textContent)).toEqual([
      'Second',
      'First',
    ]);
    expect(text(fixture)).toContain('No description');
    params.next(convertToParamMap({ id: 'c2' }));
    value.next(course('c2', { name: 'Second course' }));
    await fixture.whenStable();
    expect(course$).toHaveBeenLastCalledWith('c2');
    expect(text(fixture)).toContain('Second course');
  });
  it('renders empty reading lists and unavailable courses', async () => {
    const { fixture, books, value } = await setup();
    books.next([]);
    await fixture.whenStable();
    expect(text(fixture)).toContain('No books yet.');
    value.next(undefined);
    await fixture.whenStable();
    expect(text(fixture)).toContain('Not available in this session');
  });
  it('opens edit and navigates only after confirmed deletion', async () => {
    const { fixture, dialogs, navigate } = await setup();
    click(fixture, 'Edit course');
    expect(dialogs.editCourse).toHaveBeenCalledWith(course());
    click(fixture, 'Delete course');
    expect(navigate).not.toHaveBeenCalled();
    const callback: () => void = dialogs.deleteCourse.mock.calls[0][1];
    callback();
    expect(navigate).toHaveBeenCalledWith(['/courses']);
  });
});
