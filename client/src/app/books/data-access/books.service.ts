import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { BooksResponse } from './book';

@Service()
export class BooksService {
  private readonly http = inject(HttpClient);

  getBooks(startIndex: number) {
    return this.http.get<BooksResponse>('/api/books', { params: { startIndex } });
  }
}
