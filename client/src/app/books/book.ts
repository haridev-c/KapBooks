export interface Book {
  id: string;
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
}

export interface BooksResponse {
  books: Book[];
  nextStartIndex: number | null;
}

export interface BooksFailure {
  code: string;
  message: string;
}
