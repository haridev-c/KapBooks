import { createFeature, createReducer, on } from '@ngrx/store';
import { Course } from './course';
import { coursesActions } from './courses.actions';

export interface CoursesState {
  courses: Course[];
}
const initialState: CoursesState = { courses: [] };

export const coursesFeature = createFeature({
  name: 'courses',
  reducer: createReducer(
    initialState,
    on(coursesActions.created, (state, { course }) => ({
      ...state,
      courses: [course, ...state.courses],
    })),
    on(coursesActions.updated, (state, { course }) => ({
      ...state,
      courses: state.courses.map((existing) => (existing.id === course.id ? course : existing)),
    })),
    on(coursesActions.deleted, (state, { id }) => ({
      ...state,
      courses: state.courses.filter((course) => course.id !== id),
    })),
  ),
});
