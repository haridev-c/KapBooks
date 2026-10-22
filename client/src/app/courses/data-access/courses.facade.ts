import { inject, Service } from '@angular/core';
import { Store } from '@ngrx/store';
import { Course } from './course';
import { coursesActions } from './courses.actions';
import { coursesFeature } from './courses.state';
import { selectCourseBooks, selectCourseById, selectCoursesUsingBook } from './courses.selectors';

@Service()
export class CoursesFacade {
  private readonly store = inject(Store);
  readonly courses = this.store.selectSignal(coursesFeature.selectCourses);
  course$(id: string) {
    return this.store.select(selectCourseById(id));
  }
  books$(id: string) {
    return this.store.select(selectCourseBooks(id));
  }
  usingBook$(id: string) {
    return this.store.select(selectCoursesUsingBook(id));
  }
  create(value: Omit<Course, 'id'>) {
    this.store.dispatch(coursesActions.created({ course: { ...value, id: crypto.randomUUID() } }));
  }
  update(course: Course) {
    this.store.dispatch(coursesActions.updated({ course }));
  }
  delete(id: string) {
    this.store.dispatch(coursesActions.deleted({ id }));
  }
}
