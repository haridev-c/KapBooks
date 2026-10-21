import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { Course } from './course';

@Component({
  selector: 'app-course-card',
  imports: [RouterLink, MatCardModule, MatButtonModule],
  template: `
    <mat-card appearance="outlined">
      <mat-card-header
        ><mat-card-title
          ><a [routerLink]="['/courses', course().id]">{{ course().name }}</a></mat-card-title
        ></mat-card-header
      >
      <mat-card-content>
        <p class="preserve-lines">{{ course().description || 'No description' }}</p>
        <p>{{ course().bookIds.length }} books</p>
      </mat-card-content>
      <mat-card-actions>
        <button
          mat-button
          (click)="edit.emit(course())"
          [attr.aria-label]="'Edit ' + course().name"
        >
          Edit
        </button>
        <button
          mat-button
          (click)="remove.emit(course())"
          [attr.aria-label]="'Delete ' + course().name"
        >
          Delete
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    :host,
    mat-card {
      display: block;
      height: 100%;
    }
    mat-card {
      display: flex;
    }
    mat-card-content {
      flex: 1;
    }
    a {
      color: inherit;
    }
  `,
})
export class CourseCard {
  readonly course = input.required<Course>();
  readonly edit = output<Course>();
  readonly remove = output<Course>();
}
