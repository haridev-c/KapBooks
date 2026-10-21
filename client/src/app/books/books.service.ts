import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BooksResponse } from './book';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly http = inject(HttpClient);

  getBooks() {
    return this.http.get<BooksResponse>('/api/books');
  }
}
