import { describe, expect, it } from 'vitest';
import { book, course } from '../../../testing/fixtures';
import { coursesFeature } from './courses.state';
import { coursesActions as a } from './courses.actions';
import { selectCourseBooks, selectCourseById, selectCoursesUsingBook } from './courses.selectors';
describe('courses state and selectors', () => {
  it('creates, updates and deletes only matching courses without mutating previous state', () => {
    const initial = coursesFeature.reducer(undefined, { type: 'init' });
    expect(initial).toEqual({ courses: [] });
    let state = coursesFeature.reducer(initial, a.created({ course: course() }));
    state = coursesFeature.reducer(state, a.created({ course: course('c2') }));
    const edited = course('c1', { name: 'Edited' });
    state = coursesFeature.reducer(state, a.updated({ course: edited }));
    expect(state.courses).toEqual([course('c2'), edited]);
    expect(coursesFeature.reducer(state, a.updated({ course: course('missing') }))).toEqual(state);
    expect(coursesFeature.reducer(state, a.deleted({ id: 'c1' })).courses).toEqual([course('c2')]);
    expect(initial.courses).toEqual([]);
  });
  it('looks up courses and finds all references to a book', () => {
    const courses = [course(), course('c2'), course('c3', { bookIds: [] })];
    expect(selectCourseById('c1').projector(courses)).toBe(courses[0]);
    expect(selectCourseById('missing').projector(courses)).toBeUndefined();
    expect(selectCoursesUsingBook('b1').projector(courses)).toEqual(courses.slice(0, 2));
  });
  it('preserves reading order, skips unloaded books and handles missing courses', () => {
    expect(
      selectCourseBooks('c1').projector(course('c1', { bookIds: ['b2', 'missing', 'b1'] }), [
        book(),
        book('b2'),
      ]),
    ).toEqual([book('b2'), book()]);
    expect(selectCourseBooks('missing').projector(undefined, [book()])).toEqual([]);
  });
});
