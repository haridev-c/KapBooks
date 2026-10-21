import { z } from "zod";
import { convert } from "html-to-text";

export const PAGE_SIZE = 20;

const nonEmptyString = z.string().refine((value) => value.trim().length > 0);

const volumeInfoSchema = z.object({
  title: nonEmptyString,
  authors: z.array(nonEmptyString).min(1),
  publisher: nonEmptyString,
  publishedDate: z.iso.date().refine((value) => !value.startsWith("0000-")),
  description: z.preprocess(
    (value) =>
      typeof value === "string"
        ? convert(value, {
            wordwrap: false,
            selectors: [{ selector: "a", options: { ignoreHref: true } }],
          }).trim() || undefined
        : undefined,
    z.string().optional(),
  ),
});

const googleBookSchema = z
  .object({
    id: nonEmptyString,
    volumeInfo: volumeInfoSchema,
  })
  .transform(({ id, volumeInfo }) => ({ id, ...volumeInfo }));

const googleBooksPageSchema = z.object({
  totalItems: z.int().nonnegative(),
  // Google may omit items when a search page is empty.
  items: z.array(z.unknown()).max(PAGE_SIZE).default([]),
});

export type Book = z.output<typeof googleBookSchema>;

export interface BooksPage {
  books: Book[];
  nextStartIndex: number | null;
}

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
      const { items } = googleBooksPageSchema.parse(await response.json());
      const books = items.flatMap((item) => {
        const result = googleBookSchema.safeParse(item);
        return result.success ? [result.data] : [];
      });
      signal.throwIfAborted();
      return {
        books,
        nextStartIndex: items.length ? startIndex + PAGE_SIZE : null,
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
