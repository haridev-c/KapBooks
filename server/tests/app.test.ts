import type { Server } from "node:http";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { createApp } from "../src/app.ts";
import {
  BooksError,
  type GoogleBooksService,
  type BooksPage,
} from "../src/books.ts";

describe("GET /api/books", () => {
  const getBooks = vi.fn<GoogleBooksService["getBooks"]>();
  let server: Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = createApp({ getBooks }).listen(0, "127.0.0.1");
    await new Promise<void>((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing server port");
    baseUrl = `http://127.0.0.1:${address.port}/api/books`;
  });

  afterAll(async () => {
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
      server.closeAllConnections();
    });
  });

  beforeEach(() => {
    getBooks.mockReset();
    getBooks.mockResolvedValue({ books: [], nextStartIndex: null });
  });

  it.each([
    { query: "", offset: 0 },
    { query: "?startIndex=0", offset: 0 },
    { query: "?startIndex=1", offset: 1 },
    { query: "?startIndex=40", offset: 40 },
    {
      query: `?startIndex=${Number.MAX_SAFE_INTEGER - 20}`,
      offset: Number.MAX_SAFE_INTEGER - 20,
    },
  ])(
    "passes the parsed offset for '$query' exactly once",
    async ({ query, offset }) => {
      const response = await fetch(baseUrl + query);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        books: [],
        nextStartIndex: null,
      });
      expect(getBooks).toHaveBeenCalledExactlyOnceWith(offset);
    },
  );

  it.each([
    "",
    "-1",
    "1.5",
    "+1",
    " 1",
    "1 ",
    "01",
    "00",
    "1e2",
    "0x14",
    "NaN",
    "Infinity",
    String(Number.MAX_SAFE_INTEGER - 19),
    String(Number.MAX_SAFE_INTEGER),
    String(Number.MAX_SAFE_INTEGER + 1),
    "9".repeat(400),
  ])("rejects startIndex=%j without calling the service", async (value) => {
    const response = await fetch(
      `${baseUrl}?${new URLSearchParams({ startIndex: value })}`,
    );
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "INVALID_START_INDEX",
        message:
          "startIndex must be a non-negative safe integer with room for the next page.",
      },
    });
    expect(getBooks).not.toHaveBeenCalled();
  });


  it.each<BooksPage>([
    {
      books: [
        {
          id: "volume-1",
          title: "Practice Tests",
          authors: ["Author"],
          publisher: "Publisher",
          publishedDate: "2024-05-15",
          description: "Plain text.",
        },
      ],
      nextStartIndex: 40,
    },
    { books: [], nextStartIndex: 40 },
    { books: [], nextStartIndex: null },
  ])("forwards service response %j", async (page) => {
    getBooks.mockResolvedValue(page);
    const response = await fetch(`${baseUrl}?startIndex=20`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.json()).toEqual(page);
    expect(getBooks).toHaveBeenCalledExactlyOnceWith(20);
  });

  it.each([
    {
      code: "UPSTREAM_FAILURE",
      status: 502,
      message: "Unable to fetch books from Google Books.",
    },
    {
      code: "UPSTREAM_TIMEOUT",
      status: 504,
      message: "Google Books request timed out.",
    },
  ] as const)(
    "returns the $status envelope for $code",
    async ({ code, status, message }) => {
      getBooks.mockRejectedValue(new BooksError(code, message));
      const response = await fetch(baseUrl);
      expect(response.status).toBe(status);
      expect(await response.json()).toEqual({ error: { code, message } });
      expect(getBooks).toHaveBeenCalledExactlyOnceWith(0);
    },
  );

  it.each([
    new Error("secret API key and upstream stack"),
    "secret upstream details",
    null,
  ])("sanitizes unexpected service rejection %j", async (error) => {
    getBooks.mockRejectedValue(error);
    const response = await fetch(baseUrl);
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: {
        code: "UPSTREAM_FAILURE",
        message: "Unable to fetch books from Google Books.",
      },
    });
    expect(getBooks).toHaveBeenCalledExactlyOnceWith(0);
  });
});
