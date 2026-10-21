import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'books' },
  {
    path: 'books',
    loadComponent: () => import('./books/books-list').then((m) => m.BooksList),
    title: 'Books',
  },
  {
    path: 'books/:id',
    loadComponent: () => import('./books/book-detail').then((m) => m.BookDetail),
    title: 'Book details',
  },
  {
    path: 'courses',
    loadComponent: () => import('./courses/courses-list').then((m) => m.CoursesList),
    title: 'Courses',
  },
  {
    path: 'courses/:id',
    loadComponent: () => import('./courses/course-detail').then((m) => m.CourseDetail),
    title: 'Course details',
  },
  { path: '**', redirectTo: 'books' },
];
