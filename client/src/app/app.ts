import { Component } from '@angular/core';
import { BooksList } from './books/books-list';

@Component({
  imports: [BooksList],
  selector: 'app-root',
  template: '<app-books-list />',
})
export class App {}
