import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { course } from '../../testing/fixtures';
import { click, text } from '../../testing/dom';
import { LibraryDialogs } from '../shared/library-dialogs';
import { CoursesFacade } from './courses.facade';
import { CoursesList } from './courses-list';
describe('CoursesList', () => {
  it('renders the empty state and reacts to new courses and user actions', async () => {
    const courses = signal<ReturnType<typeof course>[]>([]);
    const dialogs = { editCourse: vi.fn(), deleteCourse: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: CoursesFacade, useValue: { courses } },
        { provide: LibraryDialogs, useValue: dialogs },
      ],
    });
    const fixture = TestBed.createComponent(CoursesList);
    await fixture.whenStable();
    expect(text(fixture)).toContain('No courses yet.');
    click(fixture, 'Create course');
    expect(dialogs.editCourse).toHaveBeenCalledWith();
    courses.set([course()]);
    await fixture.whenStable();
    expect(text(fixture)).toContain('Web development');
    click(fixture, 'Edit');
    expect(dialogs.editCourse).toHaveBeenCalledWith(course());
    click(fixture, 'Delete');
    expect(dialogs.deleteCourse).toHaveBeenCalledWith(course());
  });
});
