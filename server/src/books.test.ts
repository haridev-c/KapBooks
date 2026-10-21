import assert from "node:assert/strict";
import { once } from "node:events";
import { test, type TestContext } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createApp } from "./app.ts";
import { GoogleBooksService } from "./books.ts";

function page(items?: unknown[]): Response {
  return Response.json({
    totalItems: 100,
    ...(items === undefined ? {} : { items }),
  });
}

async function startApi(
  t: TestContext,
  service: Pick<GoogleBooksService, "getBooks">,
) {
  const server = createApp(service).listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(
    () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  );
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return "http://127.0.0.1:" + address.port + "/api/books";
}

const completeBook = {
  id: "one",
  volumeInfo: {
    title: "Book",
    authors: ["A", "B"],
    publisher: "Publisher",
    publishedDate: "2024-05-15",
  },
};

const normalizedBook = { id: completeBook.id, ...completeBook.volumeInfo };

test("accepts only complete, real publication dates without filling in missing parts", async () => {
  const dates = [
    "2024",
    "2024-05",
    "2024-2-01",
    "2023-02-29",
    "1900-02-29",
    "2024-04-31",
    "2024-00-10",
    "2024-13-01",
    "2024-01-00",
    "0000-01-01",
    "2024-05-15T00:00:00Z",
    " 2024-05-15 ",
    "2024-02-29",
    "2000-02-29",
    "0001-01-01",
  ];
  const service = new GoogleBooksService("test-key", {
    fetch: async () =>
      page(
        dates.map((publishedDate) => ({
          ...completeBook,
          volumeInfo: { ...completeBook.volumeInfo, publishedDate },
        })),
      ),
  });
  const result = await service.getBooks(0);
  assert.deepEqual(
    result.books.map((book) => book.publishedDate),
    ["2024-02-29", "2000-02-29", "0001-01-01"],
  );
  assert.equal(result.nextStartIndex, 20);
});

test("returns optional descriptions as readable plain text without dropping books", async () => {
  const descriptions = [
    undefined,
    null,
    "",
    "  ",
    123,
    "<p> </p>",
    "<p>A &amp; B</p><p>Read <b>more</b> at <a href='https://example.com'>our site</a>.</p>",
  ];
  const service = new GoogleBooksService("test-key", {
    fetch: async () =>
      page(
        descriptions.map((description) => ({
          ...completeBook,
          volumeInfo: { ...completeBook.volumeInfo, description },
        })),
      ),
  });
  const { books } = await service.getBooks(0);
  assert.equal(books.length, descriptions.length);
  assert.deepEqual(
    books.map((book) => book.description),
    [
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "A & B\n\nRead more at our site.",
    ],
  );
});

test("fetches exactly one page at the supplied offset and flattens complete books", async () => {
  const requests: URL[] = [];
  const service = new GoogleBooksService("test-key", {
    fetch: async (input) => {
      requests.push(new URL(String(input)));
      return page([completeBook, { id: "incomplete" }, completeBook]);
    },
  });
  assert.deepEqual(await service.getBooks(20), {
    books: [normalizedBook, normalizedBook],
    nextStartIndex: 40,
  });
  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].origin + requests[0].pathname,
    "https://www.googleapis.com/books/v1/volumes",
  );
  assert.deepEqual(Object.fromEntries(requests[0].searchParams), {
    q: "kaplan test prep",
    startIndex: "20",
    maxResults: "20",
    key: "test-key",
  });
});

test("stops only on an empty upstream page, including omitted items", async () => {
  for (const items of [[], undefined]) {
    const service = new GoogleBooksService("test-key", {
      fetch: async () => page(items),
    });
    assert.deepEqual(await service.getBooks(40), {
      books: [],
      nextStartIndex: null,
    });
  }
  const service = new GoogleBooksService("test-key", {
    fetch: async () =>
      Response.json({ totalItems: 0, items: [{ id: "incomplete" }] }),
  });
  assert.deepEqual(await service.getBooks(40), {
    books: [],
    nextStartIndex: 60,
  });
});

test("ignores extra upstream fields without changing IDs or metadata", async () => {
  const service = new GoogleBooksService("test-key", {
    fetch: async () =>
      Response.json({
        totalItems: 1,
        kind: "books#volumes",
        items: [
          {
            id: " one ",
            etag: "ignored",
            volumeInfo: { ...completeBook.volumeInfo, language: "ignored" },
          },
        ],
      }),
  });
  assert.deepEqual(await service.getBooks(0), {
    books: [{ ...normalizedBook, id: " one " }],
    nextStartIndex: 20,
  });
});

test("skips invalid books while keeping complete books and the next offset", async (t) => {
  const invalidBooks: unknown[] = [
    null,
    [],
    12,
    {},
    { ...completeBook, id: " " },
    { id: "one" },
    { id: "one", volumeInfo: null },
    { id: "one", volumeInfo: [] },
  ];
  for (const field of [
    "title",
    "authors",
    "publisher",
    "publishedDate",
  ] as const) {
    for (const value of [undefined, null, "", " ", 12, [], [""], [" "]]) {
      invalidBooks.push({
        ...completeBook,
        volumeInfo: { ...completeBook.volumeInfo, [field]: value },
      });
    }
  }
  for (const invalidBook of invalidBooks) {
    await t.test(JSON.stringify(invalidBook), async () => {
      const service = new GoogleBooksService("test-key", {
        fetch: async () => page([invalidBook, completeBook]),
      });
      assert.deepEqual(await service.getBooks(20), {
        books: [normalizedBook],
        nextStartIndex: 40,
      });
    });
  }
});

test("continues after an entirely filtered page until the upstream page is empty", async () => {
  const responses = [
    page([{ id: "incomplete" }, null]),
    page([completeBook]),
    page([]),
  ];
  let calls = 0;
  const service = new GoogleBooksService("test-key", {
    fetch: async () => responses[calls++],
  });
  assert.deepEqual(await service.getBooks(0), {
    books: [],
    nextStartIndex: 20,
  });
  assert.deepEqual(await service.getBooks(20), {
    books: [normalizedBook],
    nextStartIndex: 40,
  });
  assert.deepEqual(await service.getBooks(40), {
    books: [],
    nextStartIndex: null,
  });
  assert.equal(calls, 3);
});

test("rejects malformed upstream page structures", async (t) => {
  for (const body of [
    null,
    {},
    { totalItems: -1 },
    { totalItems: 1.5 },
    { totalItems: "1" },
    { totalItems: 1, items: null },
    { totalItems: 1, items: {} },
    { totalItems: 21, items: Array.from({ length: 21 }, () => completeBook) },
  ]) {
    await t.test(JSON.stringify(body), async () => {
      const service = new GoogleBooksService("test-key", {
        fetch: async () => Response.json(body),
      });
      await assert.rejects(service.getBooks(0), { code: "UPSTREAM_FAILURE" });
    });
  }
});

test("GET /api/books defaults to zero and forwards explicit offsets", async (t) => {
  const offsets: number[] = [];
  const url = await startApi(t, {
    getBooks: async (startIndex) => {
      offsets.push(startIndex);
      return { books: [], nextStartIndex: null };
    },
  });
  const largestStartIndex = Number.MAX_SAFE_INTEGER - 20;
  for (const query of [
    "",
    "?startIndex=0",
    "?startIndex=20",
    `?startIndex=${largestStartIndex}`,
  ]) {
    const response = await fetch(url + query);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      books: [],
      nextStartIndex: null,
    });
  }
  assert.deepEqual(offsets, [0, 0, 20, largestStartIndex]);
});

test("rejects invalid offsets without calling Google", async (t) => {
  let calls = 0;
  const url = await startApi(t, {
    getBooks: async () => {
      calls++;
      return { books: [], nextStartIndex: null };
    },
  });
  for (const query of [
    "?startIndex=",
    "?startIndex=-1",
    "?startIndex=1.5",
    "?startIndex=abc",
    "?startIndex=1e2",
    "?startIndex=01",
    "?startIndex=0x14",
    "?startIndex=%2020",
    "?startIndex=0&startIndex=20",
    "?startIndex=9007199254740992",
    "?startIndex=9007199254740991",
    `?startIndex=${Number.MAX_SAFE_INTEGER - 19}`,
  ]) {
    const response = await fetch(url + query);
    assert.equal(response.status, 400, query);
    const body = await response.json();
    assert.equal(body.error.code, "INVALID_START_INDEX");
  }
  assert.equal(calls, 0);
});

test("GET /api/books returns normalized books and the next offset", async (t) => {
  let calls = 0;
  const url = await startApi(
    t,
    new GoogleBooksService("test-key", {
      fetch: async () => {
        calls++;
        return page([{ id: "incomplete" }, completeBook]);
      },
    }),
  );
  const response = await fetch(url + "?startIndex=40");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    books: [normalizedBook],
    nextStartIndex: 60,
  });
  assert.equal(calls, 1);
});

test("upstream failures return safe 502 errors", async (t) => {
  const fetchers: (typeof fetch)[] = [
    async () => new Response("invalid JSON"),
    async () => {
      throw new Error("secret upstream URL with key");
    },
    async () =>
      Response.json({ error: "private quota details" }, { status: 429 }),
  ];
  for (const fetcher of fetchers) {
    const url = await startApi(
      t,
      new GoogleBooksService("test-key", { fetch: fetcher }),
    );
    const response = await fetch(url);
    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), {
      error: {
        code: "UPSTREAM_FAILURE",
        message: "Unable to fetch books from Google Books.",
      },
    });
  }
});

test("an upstream timeout aborts the request and returns 504", async (t) => {
  let aborted = false;
  const url = await startApi(
    t,
    new GoogleBooksService("test-key", {
      requestTimeoutMs: 10,
      fetch: async (_url, init) => {
        try {
          await delay(1000, undefined, { signal: init?.signal ?? undefined });
        } catch (error) {
          aborted = init?.signal?.aborted ?? false;
          throw error;
        }
        return page();
      },
    }),
  );
  const response = await fetch(url);
  assert.equal(response.status, 504);
  assert.equal(aborted, true);
  assert.deepEqual(await response.json(), {
    error: {
      code: "UPSTREAM_TIMEOUT",
      message: "Google Books request timed out.",
    },
  });
});
