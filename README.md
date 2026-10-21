# Book List Assignment

Angular 22 + NgRx Store/Effects with an Express 5 wrapper for Google Books.
The list loads 20 books on startup and appends more as you scroll. Each Express
request makes exactly one Google request. Each page success or failure is also
logged in the browser console.

The full [mockup](Books-1.png), search, book creation, sidebar, and Docker are deferred.

## Setup and run

Use Node.js 24.15+ on the 24.x line, or Node.js 26+ (verified with 26.12.0),
and npm (verified with 11.20.0).

Create a Google Cloud project, enable the Books API, and obtain an API key using
[Google's setup guide](https://developers.google.com/books/docs/v1/using#APIKey).
The key stays in Express and is never sent to Angular.

From the repository root:

```bash
npm ci --prefix server
npm ci --prefix client
cp server/.env.example server/.env
```

Set `GOOGLE_BOOKS_API_KEY` in `server/.env`. Express exits clearly if the key is
missing or blank. Environment files are ignored by git; existing environment
variables take precedence over `.env`.

Start each app in a separate terminal:

```bash
cd server
npm run dev
```

```bash
cd client
npm start
```

Open <http://localhost:4200>. The development proxy forwards `/api/**` to Express
on port 3000.

## Pagination and scrolling

`GET /api/books?startIndex=0` searches for the fixed text `kaplan test prep`.
The offset defaults to zero and must be a non-negative decimal safe integer
with room to advance by 20. Invalid or repeated offsets return HTTP 400.

Example response (illustrative data):

```json
{
  "books": [
    {
      "id": "google-volume-id",
      "title": "Example Kaplan Book",
      "authors": ["Kaplan Test Prep"],
      "publisher": null,
      "publishedDate": "2024"
    }
  ],
  "nextStartIndex": 20
}
```

Express requests up to 20 books at the supplied offset. A nonempty page advances
`nextStartIndex` by 20, even if the page is short. An empty page returns
`{ "books": [], "nextStartIndex": null }`. Pagination does not rely on Google's
`totalItems`. Missing authors become `[]`; missing title, publisher, and date become
`null`. Date precision is preserved. Malformed responses cause an error.

NgRx retains the books, loading/error state, and next offset. It appends pages,
deduplicating by ID while preserving first-seen content and order. The viewport
observer requests the next page within 300px of the list bottom and rechecks after
rendering each page to fill short viewports. Only one request runs at a time.

On failure, loaded books remain visible and automatic loading pauses. **Retry**
requests the same failed offset. Loading stops after an empty page. The list
shows loading, empty, error/retry, and end-of-list messages.

Google search results may change between requests; this is a text search, not
an exact author or publisher filter.

Errors use `{ "error": { "code": "...", "message": "..." } }`:

| HTTP | Code                  | Meaning                                                 |
| ---- | --------------------- | ------------------------------------------------------- |
| 400  | `INVALID_START_INDEX` | Invalid pagination offset.                              |
| 502  | `UPSTREAM_FAILURE`    | Upstream rejection, network failure, or malformed data. |
| 504  | `UPSTREAM_TIMEOUT`    | The Google request exceeded 10 seconds.                 |

Errors do not expose upstream details or credentials. There is no cache or
automatic retry.

## Tests and builds

From the repository root:

```bash
npm test --prefix server
npm test --prefix client -- --watch=false
npm run build --prefix server
npm run build --prefix client
```

Tests mock Google and require no API key or external network. Server integration
tests use temporary localhost ports. Coverage includes offset validation,
single-page requests, normalization, end detection, errors/timeouts, append and
deduplication, concurrent-load suppression, retry, and observer cleanup.
Angular tests simulate intersections without relying on browser layout.

After building, run the compiled API with `npm start` inside `server`.
The static client is in `client/dist/client/browser`. Production hosting must
serve it and forward `/api` to Express on the same origin; the development proxy
only applies to `npm start` inside `client`.
