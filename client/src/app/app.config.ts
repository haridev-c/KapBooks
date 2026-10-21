import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { BooksEffects } from './books/books.effects';
import { booksFeature } from './books/books.state';
import { coursesFeature } from './courses/courses.state';
import { LibraryEffects } from './shared/library.effects';
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
