import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { course } from '../../../../testing/fixtures';
import { click, element, text } from '../../../../testing/dom';
import { CourseCard } from './course-card';
describe('CourseCard', () => {
  it('renders the course, book count, description fallback and detail link', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CourseCard);
    fixture.componentRef.setInput('course', course());
    await fixture.whenStable();
    expect(text(fixture)).toContain('Web development');
    expect(text(fixture)).toContain('1 books');
    expect(text(fixture)).toContain('No description');
    expect(element(fixture, 'a').getAttribute('href')).toBe('/courses/c1');
    const edit = vi.fn();
    const remove = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.remove.subscribe(remove);
    click(fixture, 'Edit');
    click(fixture, 'Delete');
    expect(edit).toHaveBeenCalledWith(course());
    expect(remove).toHaveBeenCalledWith(course());
  });
});
