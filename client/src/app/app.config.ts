import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { BooksEffects } from './books/data-access/books.effects';
import { booksFeature } from './books/data-access/books.state';
import { coursesFeature } from './courses/data-access/courses.state';
import { LibraryEffects } from './library/library.effects';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    provideStore(),
    provideState(booksFeature),
    provideState(coursesFeature),
    provideEffects(BooksEffects, LibraryEffects),
  ],
};
