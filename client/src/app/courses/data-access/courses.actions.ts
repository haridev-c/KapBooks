import { createActionGroup, props } from '@ngrx/store';
import { Course } from './course';

export const coursesActions = createActionGroup({
  source: 'Courses',
  events: {
    Created: props<{ course: Course }>(),
    Updated: props<{ course: Course }>(),
    Deleted: props<{ id: string }>(),
  },
});
