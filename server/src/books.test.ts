import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createApp } from "./app.ts";
import { BooksError, GoogleBooksService } from "./books.ts";

function page(items?: unknown[], totalItems = items?.length ?? 0): Response {
  return Response.json({
    totalItems,
    ...(items === undefined ? {} : { items }),
  });
}

test("collects sequential pages until empty, ignoring changing totals and preserving first IDs", async () => {
  const requests: URL[] = [];
  const pages = [
    page([
      {
        id: "one",
        volumeInfo: {
          title: "First",
          authors: ["Kaplan"],
          publishedDate: "2020",
        },
      },
    ]),
    page(
      [{ id: "one", volumeInfo: { title: "Duplicate" } }, { id: "two" }],
      500,
    ),
    page(),
  ];
  const service = new GoogleBooksService("test-key", {
    fetch: async (input) => {
      requests.push(new URL(String(input)));
      return pages.shift()!;
    },
  });

  assert.deepEqual(await service.getBooks(), [
    {
      id: "one",
      title: "First",
      authors: ["Kaplan"],
      publisher: null,
      publishedDate: "2020",
    },
    {
      id: "two",
      title: null,
      authors: [],
      publisher: null,
      publishedDate: null,
    },
  ]);
  assert.deepEqual(
    requests.map((url) => url.searchParams.get("startIndex")),
    ["0", "40", "80"],
  );
  for (const url of requests) {
    assert.equal(
      url.origin + url.pathname,
      "https://www.googleapis.com/books/v1/volumes",
    );
    assert.equal(url.searchParams.get("q"), "kaplan test prep");
    assert.equal(url.searchParams.get("maxResults"), "40");
    assert.equal(url.searchParams.get("key"), "test-key");
  }
});

test("accepts empty results", async () => {
  const service = new GoogleBooksService("test-key", {
    fetch: async () => page([]),
  });
  assert.deepEqual(await service.getBooks(), []);
});

test("preserves complete metadata and partial date precision", async () => {
  const pages = [
    page([
      {
        id: "one",
        volumeInfo: {
          title: "Book",
          authors: ["A", "B"],
          publisher: "Publisher",
          publishedDate: "2024-05",
        },
      },
    ]),
    page(),
  ];
  const service = new GoogleBooksService("test-key", {
    fetch: async () => pages.shift()!,
  });
  assert.deepEqual(await service.getBooks(), [
    {
      id: "one",
      title: "Book",
      authors: ["A", "B"],
      publisher: "Publisher",
      publishedDate: "2024-05",
    },
  ]);
});

test("rejects malformed upstream responses and volumes", async (t) => {
  const malformed = [
    null,
    {},
    { totalItems: -1 },
    { totalItems: "1" },
    { totalItems: 1, items: {} },
    { totalItems: 1, items: null },
    { totalItems: 1, items: [{}] },
    { totalItems: 1, items: [{ id: " " }] },
    { totalItems: 1, items: [{ id: "one", volumeInfo: [] }] },
    { totalItems: 1, items: [{ id: "one", volumeInfo: { title: 12 } }] },
    { totalItems: 1, items: [{ id: "one", volumeInfo: { authors: [12] } }] },
    { totalItems: 1, items: [{ id: "one", volumeInfo: { publisher: false } }] },
    {
      totalItems: 1,
      items: [{ id: "one", volumeInfo: { publishedDate: 2020 } }],
    },
  ];
  for (const body of malformed) {
    await t.test(JSON.stringify(body), async () => {
      const service = new GoogleBooksService("test-key", {
        fetch: async () => Response.json(body),
      });
      await assert.rejects(service.getBooks(), { code: "UPSTREAM_FAILURE" });
    });
  }
});

test("rejects invalid JSON, network errors, and non-success responses without leaking details", async () => {
  const fetchers: (typeof fetch)[] = [
    async () => new Response("not json"),
    async () => {
      throw new Error("secret upstream URL with key");
    },
    async () =>
      Response.json({ error: "private quota details" }, { status: 429 }),
  ];
  for (const fetcher of fetchers) {
    const service = new GoogleBooksService("test-key", { fetch: fetcher });
    await assert.rejects(service.getBooks(), {
      code: "UPSTREAM_FAILURE",
      message: "Unable to fetch books from Google Books.",
    });
  }
});

test("fails after the configured page limit instead of returning a partial collection", async () => {
  let calls = 0;
  const service = new GoogleBooksService("test-key", {
    maxPages: 2,
    fetch: async () => {
      calls++;
      return page([{ id: String(calls) }]);
    },
  });
  await assert.rejects(service.getBooks(), { code: "COLLECTION_LIMIT" });
  assert.equal(calls, 2);
});

test("enforces per-request and overall timeouts", async (t) => {
  for (const options of [
    { requestTimeoutMs: 10, overallTimeoutMs: 1000 },
    { requestTimeoutMs: 1000, overallTimeoutMs: 10 },
  ]) {
    await t.test(JSON.stringify(options), async () => {
      const service = new GoogleBooksService("test-key", {
        ...options,
        fetch: async (_url, init) => {
          await delay(1000, undefined, { signal: init?.signal ?? undefined });
          return page();
        },
      });
      await assert.rejects(service.getBooks(), {
        code: "UPSTREAM_TIMEOUT",
        status: 504,
      });
    });
  }
});

test("the overall deadline is shared across pages", async () => {
  let calls = 0;
  const service = new GoogleBooksService("test-key", {
    requestTimeoutMs: 1000,
    overallTimeoutMs: 50,
    fetch: async (_url, init) => {
      calls++;
      if (calls === 1) return page([{ id: "one" }]);
      await delay(1000, undefined, { signal: init?.signal ?? undefined });
      return page();
    },
  });
  await assert.rejects(service.getBooks(), { code: "UPSTREAM_TIMEOUT" });
  assert.equal(calls, 2);
});

test("GET /api/books integrates collection, normalization, and safe error responses", async (t) => {
  const cases = [
    {
      name: "success",
      pages: [page([{ id: "one" }]), page()],
      status: 200,
      body: {
        books: [
          {
            id: "one",
            title: null,
            authors: [],
            publisher: null,
            publishedDate: null,
          },
        ],
      },
    },
    {
      name: "later page failure",
      pages: [page([{ id: "one" }]), new Response("secret", { status: 500 })],
      status: 502,
      body: {
        error: {
          code: "UPSTREAM_FAILURE",
          message: "Unable to fetch books from Google Books.",
        },
      },
    },
  ];
  for (const scenario of cases) {
    await t.test(scenario.name, async () => {
      const app = createApp(
        new GoogleBooksService("test-key", {
          fetch: async () => scenario.pages.shift()!,
        }),
      );
      const server = app.listen(0, "127.0.0.1");
      t.after(
        () =>
          new Promise<void>((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          ),
      );
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/books`,
      );
      assert.equal(response.status, scenario.status);
      assert.deepEqual(await response.json(), scenario.body);
    });
  }
});

test("GET /api/books maps timeouts and collection limits to their HTTP statuses", async (t) => {
  for (const code of ["UPSTREAM_TIMEOUT", "COLLECTION_LIMIT"] as const) {
    await t.test(code, async () => {
      const error = new BooksError(code, "Collection could not complete.");
      const server = createApp({
        getBooks: async () => {
          throw error;
        },
      }).listen(0, "127.0.0.1");
      t.after(
        () =>
          new Promise<void>((resolve, reject) =>
            server.close((failure) => (failure ? reject(failure) : resolve())),
          ),
      );
      await once(server, "listening");
      const address = server.address();
      assert.ok(address && typeof address !== "string");
      const response = await fetch(
        `http://127.0.0.1:${address.port}/api/books`,
      );
      assert.equal(response.status, code === "UPSTREAM_TIMEOUT" ? 504 : 502);
      assert.deepEqual(await response.json(), {
        error: { code, message: error.message },
      });
    });
  }
});
