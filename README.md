# Book List Assignment

Angular 22 + NgRx Store/Effects with an Express 5 wrapper for Google Books.
On application load, Angular dispatches a books load action, fetches `/api/books`
through Express, stores the result, and logs `Books loaded:` followed by the books
array in the browser console. Errors are stored and logged as `Books load failed:`.

This first slice retains the Angular starter screen. The listing design in
[Books-1.png](Books-1.png), search, book creation, sidebar, and Docker are deferred.

## Prerequisites

- Node.js 24.15+ on the 24.x line, or Node.js 26+ (verified with 26.12.0).
- npm (verified with 11.20.0).
- A Google Cloud project with the Books API enabled and an API key. Follow the
  [Google Books API setup guide](https://developers.google.com/books/docs/v1/using#auth).
  Keep the key on the server; it is never sent to Angular.

## Run locally

From the repository root, install both apps:

```bash
npm ci --prefix server
npm ci --prefix client
cp server/.env.example server/.env
```

Set `GOOGLE_BOOKS_API_KEY` in `server/.env` to your key. Environment files are
ignored by git; `.env.example` contains only a placeholder. Express exits with a
clear message if the key is absent or blank. An existing environment variable
takes precedence over the value in `.env`.

Start Express in one terminal:

```bash
cd server
npm run dev
```

Start Angular in another terminal:

```bash
cd client
npm start
```

Open <http://localhost:4200> and the browser developer console. Angular's development
proxy forwards `/api/**` to Express at <http://localhost:3000>; the browser does not
call Google directly. The page remains the starter UI while the request runs.

You can also call the endpoint directly:

```bash
curl http://localhost:3000/api/books
```

## API behavior

`GET /api/books` takes no query parameters and searches for the fixed text
`kaplan test prep`. This preserves the assignment's query; it is not an exact
publisher or author filter.

Example response shape (illustrative data):

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
  ]
}
```

The service requests sequential Google pages of 40 books, advancing `startIndex`
by 40 until an empty page. It deduplicates by Google volume ID, keeping the first
occurrence and order. Missing authors become `[]`; missing title, publisher, and
publication date become `null`. Dates retain Google's original precision. Missing
IDs, invalid metadata types, and malformed responses cause failure.

Collection has a 10-second timeout per upstream request, a 60-second overall
deadline, and a maximum of 100 pages (including the terminating empty-page
request). If any page fails, the endpoint returns an error without partial books.
Google search results can change between pages, so this collection is not a
guaranteed snapshot. There is no server cache or automatic retry; each endpoint
call starts a new collection and consumes Google API quota.

Errors use `{ "error": { "code": "...", "message": "..." } }`:

| HTTP status | Code               | Meaning                                                                         |
| ----------- | ------------------ | ------------------------------------------------------------------------------- |
| 502         | `UPSTREAM_FAILURE` | Google rejected the request, the network failed, or the response was malformed. |
| 502         | `COLLECTION_LIMIT` | 100 pages were fetched without reaching an empty page.                          |
| 504         | `UPSTREAM_TIMEOUT` | A request or the overall collection timed out.                                  |

Responses do not expose Google's error bodies or the API key. A later NgRx load
action can retry after failure. `exhaustMap` ignores additional load actions while
a request is in progress; no retry control is added to the UI in this slice.

## Tests and builds

From the repository root:

```bash
npm test --prefix server
npm test --prefix client -- --watch=false
npm run build --prefix server
npm run build --prefix client
```

Tests mock all Google responses and require no API key or external network.
Express integration tests bind temporary localhost ports. They cover collection,
normalization, deduplication, malformed data, upstream failures, timeouts, and
error status codes. Angular tests cover the HTTP service, reducer/selectors,
startup dispatch, success/error logs, retry after failure, and concurrent-load
suppression.

After building, run the compiled server with:

```bash
cd server
npm start
```

The client build is in `client/dist/client/browser`. The Angular development proxy
only applies to `npm start`; production hosting must serve the static client and
forward `/api` to Express on the same origin. Production hosting is deferred.

## Code organization

- Express: the importable app defines the endpoint, the Google Books service owns
  upstream requests and normalization, and the entrypoint validates configuration
  and listens on port 3000.
- Angular: a books HTTP service calls Express; NgRx actions, reducer/selectors,
  and effects own loading/data/error state. The root component only dispatches
  startup loading. Non-dispatching effects handle console logging.
