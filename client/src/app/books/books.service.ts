import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { BooksResponse } from './book';

@Injectable({ providedIn: 'root' })
export class BooksService {
  private readonly http = inject(HttpClient);

  getBooks(startIndex: number) {
    return this.http.get<BooksResponse>('/api/books', { params: { startIndex } });
  }
}
