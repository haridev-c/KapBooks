export interface Book {
  id: string;
  title: string | null;
  authors: string[];
  publisher: string | null;
  publishedDate: string | null;
}

export class BooksError extends Error {
  readonly code: "UPSTREAM_FAILURE" | "COLLECTION_LIMIT" | "UPSTREAM_TIMEOUT";

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
  if (!Array.isArray(items) || items.length > 40) throw upstreamFailure();
  return items.map(normalizeBook);
}

interface GoogleBooksOptions {
  fetch?: typeof fetch;
  requestTimeoutMs?: number;
  overallTimeoutMs?: number;
  maxPages?: number;
}

export class GoogleBooksService {
  private readonly apiKey: string;
  private readonly fetchPage: typeof fetch;
  private readonly requestTimeoutMs: number;
  private readonly overallTimeoutMs: number;
  private readonly maxPages: number;

  constructor(apiKey: string, options: GoogleBooksOptions = {}) {
    this.apiKey = apiKey;
    this.fetchPage = options.fetch ?? fetch;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 10_000;
    this.overallTimeoutMs = options.overallTimeoutMs ?? 60_000;
    this.maxPages = options.maxPages ?? 100;
  }

  async getBooks(): Promise<Book[]> {
    const books = new Map<string, Book>();
    const deadline = AbortSignal.timeout(this.overallTimeoutMs);

    for (let page = 0; page < this.maxPages; page++) {
      const signal = AbortSignal.any([
        deadline,
        AbortSignal.timeout(this.requestTimeoutMs),
      ]);
      const url = new URL("https://www.googleapis.com/books/v1/volumes");
      url.search = new URLSearchParams({
        q: "kaplan test prep",
        startIndex: String(page * 40),
        maxResults: "40",
        key: this.apiKey,
      }).toString();

      let pageBooks: Book[];
      try {
        signal.throwIfAborted();
        const response = await this.fetchPage(url, { signal });
        if (!response.ok) throw upstreamFailure();
        pageBooks = parsePage(await response.json());
        signal.throwIfAborted();
      } catch (error) {
        if (signal.aborted) {
          throw new BooksError(
            "UPSTREAM_TIMEOUT",
            "Google Books collection timed out.",
          );
        }
        if (error instanceof BooksError) throw error;
        throw upstreamFailure();
      }

      if (pageBooks.length === 0) return [...books.values()];
      for (const book of pageBooks) {
        if (!books.has(book.id)) books.set(book.id, book);
      }
    }
    throw new BooksError(
      "COLLECTION_LIMIT",
      "Google Books collection exceeded the page limit.",
    );
  }
}
