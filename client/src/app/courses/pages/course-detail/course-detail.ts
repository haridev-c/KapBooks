import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { map, switchMap } from 'rxjs';
import { CoursesFacade } from '../../data-access/courses.facade';
import { LibraryDialogs } from '../../../library/library-dialogs';

@Component({
  selector: 'app-course-detail',
  imports: [RouterLink, MatButtonModule],
  template: `
    <a mat-button routerLink="/courses">Back to Courses</a>
    @if (course(); as course) {
      <div class="page-heading">
        <h1>{{ course.name }}</h1>
        <div class="actions">
          <button mat-flat-button (click)="dialogs.editCourse(course)">Edit course</button>
          <button mat-stroked-button (click)="remove()">Delete course</button>
        </div>
      </div>
      <p class="preserve-lines">{{ course.description || 'No description' }}</p>
      <h2>Reading list</h2>
      <ol class="reading-list">
        @for (book of books(); track book.id) {
          <li>
            <a [routerLink]="['/books', book.id]">{{ book.title || 'Untitled book' }}</a>
            <p>{{ book.authors.join(', ') }}</p>
          </li>
        }
      </ol>
      @if (!books().length) {
        <p>No books yet. Edit the course to add books.</p>
      }
    } @else {
      <h1>Not available in this session</h1>
      <p>This course is unavailable or was deleted. Changes reset on refresh.</p>
    }
  `,
})
export class CourseDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(CoursesFacade);
  protected readonly dialogs = inject(LibraryDialogs);
  private readonly id$ = this.route.paramMap.pipe(map((params) => params.get('id')!));
  protected readonly course = toSignal(this.id$.pipe(switchMap((id) => this.facade.course$(id))));
  protected readonly books = toSignal(this.id$.pipe(switchMap((id) => this.facade.books$(id))), {
    initialValue: [],
  });
  protected remove() {
    const course = this.course();
    if (course)
      this.dialogs.deleteCourse(course, () => {
        void this.router.navigate(['/courses']);
      });
  }
}
