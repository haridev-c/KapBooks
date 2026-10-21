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

test("fetches exactly one page of 20 at the supplied offset and normalizes books", async () => {
  const requests: URL[] = [];
  const service = new GoogleBooksService("test-key", {
    fetch: async (input) => {
      requests.push(new URL(String(input)));
      return page([
        {
          id: "one",
          volumeInfo: {
            title: "Book",
            authors: ["A", "B"],
            publisher: "Publisher",
            publishedDate: "2024-05",
          },
        },
        { id: "two" },
        { id: "one", volumeInfo: { title: "Duplicate" } },
      ]);
    },
  });
  assert.deepEqual(await service.getBooks(20), {
    books: [
      {
        id: "one",
        title: "Book",
        authors: ["A", "B"],
        publisher: "Publisher",
        publishedDate: "2024-05",
      },
      {
        id: "two",
        title: null,
        authors: [],
        publisher: null,
        publishedDate: null,
      },
      {
        id: "one",
        title: "Duplicate",
        authors: [],
        publisher: null,
        publishedDate: null,
      },
    ],
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

test("stops only on an empty page, including omitted items", async () => {
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
    fetch: async () => Response.json({ totalItems: 0, items: [{ id: "one" }] }),
  });
  assert.equal((await service.getBooks(40)).nextStartIndex, 60);
});

test("rejects malformed upstream responses and book fields", async (t) => {
  for (const body of [
    null,
    {},
    { totalItems: -1 },
    { totalItems: "1" },
    { totalItems: 1, items: null },
    { totalItems: 1, items: {} },
    {
      totalItems: 21,
      items: Array.from({ length: 21 }, () => ({ id: "one" })),
    },
    ...[
      {},
      { id: " " },
      { id: "one", volumeInfo: [] },
      { id: "one", volumeInfo: { title: 12 } },
      { id: "one", volumeInfo: { authors: [12] } },
      { id: "one", volumeInfo: { publisher: false } },
      { id: "one", volumeInfo: { publishedDate: 2020 } },
    ].map((book) => ({ totalItems: 1, items: [book] })),
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
  for (const query of ["", "?startIndex=0", "?startIndex=20"]) {
    const response = await fetch(url + query);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      books: [],
      nextStartIndex: null,
    });
  }
  assert.deepEqual(offsets, [0, 0, 20]);
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
    "?startIndex=%2020",
    "?startIndex=0&startIndex=20",
    "?startIndex=9007199254740992",
    "?startIndex=9007199254740991",
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
        return page([{ id: "one" }]);
      },
    }),
  );
  const response = await fetch(url + "?startIndex=40");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    books: [
      {
        id: "one",
        title: null,
        authors: [],
        publisher: null,
        publishedDate: null,
      },
    ],
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
