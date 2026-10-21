import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { CourseCard } from './course-card';
import { CoursesFacade } from './courses.facade';
import { LibraryDialogs } from '../shared/library-dialogs';

@Component({
  selector: 'app-courses-list',
  imports: [MatButtonModule, CourseCard],
  template: `
    <section aria-labelledby="courses-heading">
      <div class="page-heading">
        <h1 id="courses-heading">Courses</h1>
        <button mat-flat-button (click)="dialogs.editCourse()">Create course</button>
      </div>
      <p>Organize books into ordered reading lists. Changes last until refresh.</p>
      <ul class="card-grid" aria-label="Courses">
        @for (course of courses.courses(); track course.id) {
          <li>
            <app-course-card
              [course]="course"
              (edit)="dialogs.editCourse($event)"
              (remove)="dialogs.deleteCourse($event)"
            />
          </li>
        }
      </ul>
      @if (!courses.courses().length) {
        <p>No courses yet. Create your first reading list.</p>
      }
    </section>
  `,
})
export class CoursesList {
  protected readonly courses = inject(CoursesFacade);
  protected readonly dialogs = inject(LibraryDialogs);
}
