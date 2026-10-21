import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideEffects } from '@ngrx/effects';
import { provideState, provideStore } from '@ngrx/store';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { BooksEffects } from './books/books.effects';
import { booksFeature } from './books/books.state';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    provideStore(),
    provideState(booksFeature),
    provideEffects(BooksEffects),
  ],
};
