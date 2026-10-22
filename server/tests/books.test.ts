import { beforeEach, describe, expect, it, vi } from "vitest";
import { BooksError, GoogleBooksService } from "../src/books.ts";

function volume() {
  return {
    id: "volume-1",
    volumeInfo: {
      title: "Practice Tests",
      authors: ["First Author", "Second Author"],
      publisher: "Test Publisher",
      publishedDate: "2024-05-15",
    },
  };
}

describe("GoogleBooksService", () => {
  const fetchPage = vi.fn<typeof fetch>();
  let controller: AbortController;
  let service: GoogleBooksService;

  beforeEach(() => {
    fetchPage.mockReset();
    controller = new AbortController();
    vi.spyOn(AbortSignal, "timeout").mockImplementation(
      () => controller.signal,
    );
    service = new GoogleBooksService("test-key +&?", { fetch: fetchPage });
  });

  function respond(body: unknown) {
    fetchPage.mockResolvedValue(Response.json(body));
  }

  function respondWithItem(item: unknown) {
    respond({ totalItems: 1, items: [item] });
  }

  async function expectFailure(promise: Promise<unknown>) {
    await expect(promise).rejects.toBeInstanceOf(BooksError);
    await expect(promise).rejects.toMatchObject({
      code: "UPSTREAM_FAILURE",
      status: 502,
      message: "Unable to fetch books from Google Books.",
    });
    expect(fetchPage).toHaveBeenCalledTimes(1);
  }

  it("makes one correctly encoded Google request with the default deadline", async () => {
    respond({ totalItems: 0 });
    await service.getBooks(40);

    expect(fetchPage).toHaveBeenCalledTimes(1);
    const [url, options] = fetchPage.mock.calls[0]!;
    expect(url).toBeInstanceOf(URL);
    const requestUrl = new URL(String(url));
    expect(requestUrl.origin + requestUrl.pathname).toBe(
      "https://www.googleapis.com/books/v1/volumes",
    );
    expect(Object.fromEntries(requestUrl.searchParams)).toEqual({
      q: "kaplan test prep",
      startIndex: "40",
      maxResults: "20",
      key: "test-key +&?",
    });
    expect(options).toEqual({ signal: controller.signal });
    expect(AbortSignal.timeout).toHaveBeenCalledExactlyOnceWith(10_000);
  });

  it("uses the configured deadline", async () => {
    respond({ totalItems: 0 });
    const customService = new GoogleBooksService("key", {
      fetch: fetchPage,
      requestTimeoutMs: 250,
    });
    await customService.getBooks(0);
    expect(AbortSignal.timeout).toHaveBeenCalledExactlyOnceWith(250);
  });

  it("flattens records, strips extra fields, and preserves order", async () => {
    const first = volume();
    const second = { ...volume(), id: "volume-2" };
    respond({
      totalItems: 100,
      items: [
        {
          ...first,
          selfLink: "ignored",
          volumeInfo: { ...first.volumeInfo, pageCount: 42 },
        },
        second,
      ],
    });
    expect(await service.getBooks(0)).toEqual({
      books: [
        { id: first.id, ...first.volumeInfo },
        { id: second.id, ...second.volumeInfo },
      ],
      nextStartIndex: 20,
    });
  });

  it("preserves surrounding whitespace in required metadata", async () => {
    const item = volume();
    item.id = " volume-1 ";
    item.volumeInfo.title = " Practice Tests ";
    item.volumeInfo.authors = [" First Author "];
    item.volumeInfo.publisher = " Publisher ";
    respondWithItem(item);
    expect((await service.getBooks(0)).books).toEqual([
      { id: item.id, ...item.volumeInfo },
    ]);
  });

  const invalidStrings = [undefined, null, "", " \t\n", 123, [], {}];
  it.each(invalidStrings.map((id) => ({ id })))(
    "skips invalid ID $id",
    async ({ id }) => {
      respondWithItem({ ...volume(), id });
      expect((await service.getBooks(0)).books).toEqual([]);
    },
  );

  describe.each(["title", "publisher"])("%s validation", (field) => {
    it.each(invalidStrings.map((value) => ({ value })))(
      "skips invalid value $value",
      async ({ value }) => {
        const item = volume();
        respondWithItem({
          ...item,
          volumeInfo: { ...item.volumeInfo, [field]: value },
        });
        expect((await service.getBooks(0)).books).toEqual([]);
      },
    );
  });

  it.each(
    [
      undefined,
      null,
      "Author",
      [],
      [""],
      [" \t"],
      [null],
      [123],
      ["Valid Author", ""],
    ].map((authors) => ({ authors })),
  )("skips invalid authors $authors", async ({ authors }) => {
    const item = volume();
    respondWithItem({ ...item, volumeInfo: { ...item.volumeInfo, authors } });
    expect((await service.getBooks(0)).books).toEqual([]);
  });

  it.each([
    undefined,
    null,
    "",
    "2024",
    "2024-05",
    "2023-02-29",
    "1900-02-29",
    "2024-04-31",
    "2024-13-01",
    "2024-01-00",
    "0000-01-01",
    "2024-5-15",
    "2024-05-15T00:00:00Z",
    20240515,
  ])("skips invalid publication date %j", async (publishedDate) => {
    const item = volume();
    respondWithItem({
      ...item,
      volumeInfo: { ...item.volumeInfo, publishedDate },
    });
    expect((await service.getBooks(0)).books).toEqual([]);
  });

  it.each(["2024-02-29", "2000-02-29", "2023-02-28", "2024-12-31"])(
    "accepts calendar date %s",
    async (publishedDate) => {
      const item = volume();
      respondWithItem({
        ...item,
        volumeInfo: { ...item.volumeInfo, publishedDate },
      });
      expect((await service.getBooks(0)).books[0]?.publishedDate).toBe(
        publishedDate,
      );
    },
  );

  it.each([
    null,
    42,
    {},
    { id: "incomplete" },
    { ...volume(), volumeInfo: null },
  ])(
    "skips malformed record %j without losing valid neighbors",
    async (invalid) => {
      const first = volume();
      const second = { ...volume(), id: "volume-2" };
      respond({ totalItems: 3, items: [first, invalid, second] });
      expect((await service.getBooks(0)).books.map((book) => book.id)).toEqual([
        "volume-1",
        "volume-2",
      ]);
    },
  );

  it("converts HTML and entities while omitting link destinations", async () => {
    const item = volume();
    respondWithItem({
      ...item,
      volumeInfo: {
        ...item.volumeInfo,
        description:
          ' <p>Practice &amp; learn <a href="https://example.com/private">here</a>.</p> ',
      },
    });
    expect((await service.getBooks(0)).books[0]?.description).toBe(
      "Practice & learn here.",
    );
  });

  it("does not wrap long description lines", async () => {
    const item = volume();
    const description = "Practice questions and answers. ".repeat(10).trim();
    respondWithItem({
      ...item,
      volumeInfo: { ...item.volumeInfo, description },
    });
    expect((await service.getBooks(0)).books[0]?.description).toBe(description);
  });

  it.each(
    [undefined, null, "", " \n ", "<p> </p>", "&nbsp;", 123, {}, []].map(
      (description) => ({ description }),
    ),
  )(
    "omits description $description without rejecting the book",
    async ({ description }) => {
      const item = volume();
      respondWithItem({
        ...item,
        volumeInfo: { ...item.volumeInfo, description },
      });
      const { books } = await service.getBooks(0);
      expect(books).toHaveLength(1);
      expect(books[0]?.description).toBeUndefined();
    },
  );

  it.each([
    {
      label: "full",
      items: Array.from({ length: 20 }, (_, id) => ({
        ...volume(),
        id: String(id),
      })),
    },
    { label: "short", items: [volume()] },
    { label: "all skipped", items: [null, {}] },
  ])(
    "advances a $label page by 20 regardless of totalItems",
    async ({ items }) => {
      respond({ totalItems: 0, items });
      const page = await service.getBooks(40);
      expect(page.nextStartIndex).toBe(60);
      expect(page.books).toHaveLength(items[0] === null ? 0 : items.length);
    },
  );

  it.each([{ totalItems: 100, items: [] }, { totalItems: 100 }])(
    "ends pagination for empty or omitted items: %j",
    async (body) => {
      respond(body);
      expect(await service.getBooks(40)).toEqual({
        books: [],
        nextStartIndex: null,
      });
    },
  );

  it.each(
    [
      null,
      [],
      "invalid",
      {},
      { items: [] },
      ...[null, -1, 1.5, "1", Number.MAX_SAFE_INTEGER + 1].map(
        (totalItems) => ({ totalItems, items: [] }),
      ),
      ...[null, {}, "invalid"].map((items) => ({ totalItems: 1, items })),
      { totalItems: 21, items: Array.from({ length: 21 }, volume) },
    ].map((body) => ({ body })),
  )("rejects malformed page $body", async ({ body }) => {
    respond(body);
    await expectFailure(service.getBooks(0));
  });

  it("sanitizes invalid JSON without retrying", async () => {
    fetchPage.mockResolvedValue(new Response("not JSON: secret-key"));
    await expectFailure(service.getBooks(0));
  });

  it.each([400, 401, 429, 500, 503])(
    "sanitizes upstream HTTP %i without retrying",
    async (status) => {
      fetchPage.mockResolvedValue(
        new Response("secret upstream details", { status }),
      );
      await expectFailure(service.getBooks(0));
    },
  );

  it.each([
    new Error("network failure with secret-key"),
    new DOMException("unrelated abort with secret-key", "AbortError"),
  ])("sanitizes fetch rejection %s without retrying", async (error) => {
    fetchPage.mockRejectedValue(error);
    await expectFailure(service.getBooks(0));
  });

});

describe("BooksError", () => {
  it.each([
    { code: "UPSTREAM_FAILURE", status: 502 },
    { code: "UPSTREAM_TIMEOUT", status: 504 },
  ] as const)("preserves $code and maps it to $status", ({ code, status }) => {
    const error = new BooksError(code, "Public message");
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("Public message");
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
  });
});
