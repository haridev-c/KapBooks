export interface Book {
  id: string;
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
}

export interface BooksPage {
  books: Book[];
  nextStartIndex: number | null;
}

export const PAGE_SIZE = 20;

export class BooksError extends Error {
  readonly code: "UPSTREAM_FAILURE" | "UPSTREAM_TIMEOUT";

  constructor(code: BooksError["code"], message: string) {
    super(message);
    this.code = code;
  }

  get status(): number {
    return this.code === "UPSTREAM_TIMEOUT" ? 504 : 502;
  }
}

function upstreamFailure(): BooksError {
  return new BooksError(
    "UPSTREAM_FAILURE",
    "Unable to fetch books from Google Books.",
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalString(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") throw upstreamFailure();
  return value;
}

function normalizeBook(value: unknown): Book {
  if (!isRecord(value) || typeof value.id !== "string" || !value.id.trim()) {
    throw upstreamFailure();
  }
  const info = value.volumeInfo ?? {};
  if (!isRecord(info)) throw upstreamFailure();
  const authors = info.authors ?? [];
  if (
    !Array.isArray(authors) ||
    !authors.every((author) => typeof author === "string")
  ) {
    throw upstreamFailure();
  }
  return {
    id: value.id,
    title: optionalString(info.title),
    authors,
    publisher: optionalString(info.publisher),
    publishedDate: optionalString(info.publishedDate),
  };
}

function parsePage(value: unknown): Book[] {
  if (
    !isRecord(value) ||
    !Number.isInteger(value.totalItems) ||
    Number(value.totalItems) < 0
  ) {
    throw upstreamFailure();
  }
  // Google may omit items when a search page is empty.
  const items = value.items === undefined ? [] : value.items;
  if (!Array.isArray(items) || items.length > PAGE_SIZE)
    throw upstreamFailure();
  return items.map(normalizeBook);
}

interface GoogleBooksOptions {
  fetch?: typeof fetch;
  requestTimeoutMs?: number;
}

export class GoogleBooksService {
  private readonly apiKey: string;
  private readonly fetchPage: typeof fetch;
  private readonly requestTimeoutMs: number;

  constructor(apiKey: string, options: GoogleBooksOptions = {}) {
    this.apiKey = apiKey;
    this.fetchPage = options.fetch ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
  }

  async getBooks(startIndex: number): Promise<BooksPage> {
    const signal = AbortSignal.timeout(this.requestTimeoutMs);
    const url = new URL("https://www.googleapis.com/books/v1/volumes");
    url.search = new URLSearchParams({
      q: "kaplan test prep",
      startIndex: String(startIndex),
      maxResults: String(PAGE_SIZE),
      key: this.apiKey,
    }).toString();

    try {
      signal.throwIfAborted();
      const response = await this.fetchPage(url, { signal });
      if (!response.ok) throw upstreamFailure();
      const books = parsePage(await response.json());
      signal.throwIfAborted();
      return {
        books,
        nextStartIndex: books.length ? startIndex + PAGE_SIZE : null,
      };
    } catch (error) {
      if (signal.aborted) {
        throw new BooksError(
          "UPSTREAM_TIMEOUT",
          "Google Books request timed out.",
        );
      }
      if (error instanceof BooksError) throw error;
      throw upstreamFailure();
    }
  }
}
