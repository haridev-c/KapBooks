# KapBooks

Angular 22 + NgRx Store/Effects with an Express 5 wrapper for Google Books.
The list fetches up to 20 source records per page and appends more as you scroll. Each Express
request makes exactly one Google request. Each page success or failure is also
logged in the browser console.

The client uses Angular Material with a light green KapBooks theme.
Books support local search and metadata CRUD; courses
are ordered book collections. All mutations live in NgRx memory: **refresh resets
created records, edits, deletions, and courses**. The server remains read-only.

## Client features

- `/books` searches loaded/local books across title, authors, and publisher. All
  query words must match, case-insensitively. Use **Load more books** during search
  to fetch more pages; outside search, scrolling loads automatically.
- Book dialogs require a trimmed title, at least one author (one per line),
  publisher, and a valid full publication date. Use the calendar picker or type
  `YYYY-MM-DD`. Descriptions are optional plain text. Duplicate titles are allowed. Cancel or dismiss discards unsaved drafts.
- `/books/:id` shows metadata, a description when available, and linked courses.
  Deletion is blocked while a course references the book; remove those references first.
- `/courses` and `/courses/:id` manage named reading lists. Description and books
  are optional; duplicate course names are allowed. Add loaded books once per
  course and arrange them with Move up/down controls.
- Creates appear first and edits retain position. Local edits and deleted IDs
  survive subsequent page loads. Courses reflect updated book metadata.
- Missing detail IDs show “Not available in this session”; detail routes do not
  fetch the entire catalog or restore previous session data.
- Responsive navigation groups Books under Content Management and links to
  Courses. Facades connect UI to state; selectors derive search and relationships;
  effects handle API requests, the cross-feature deletion guard, and snackbars.

Persistence, lesson authoring, enrollment, progress tracking, and Docker are deferred.

## Client structure

Under `client/src/app`, `books/` and `courses/` each group their files into:

- `data-access/`: models, HTTP requests, facades, and NgRx state, selectors, actions, and effects.
- `pages/`: routed list and detail screens, with a folder per screen.
- `ui/`: cards and form dialogs, with a folder per UI element. The publication date
  adapter lives beside the book form that uses it.

`library/` coordinates books and courses through dialogs, deletion rules, and
notifications. `shared/` holds reusable UI and form helpers without feature-specific
dependencies. Tests live beside the files they exercise; common test helpers and
fixtures live in `client/src/testing/`.

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
      "publisher": "Kaplan Publishing",
      "publishedDate": "2024-05-15",
      "description": "Practice questions and study guidance."
    }
  ],
  "nextStartIndex": 20
}
```

Express requests up to 20 books at the supplied offset. A nonempty page advances
`nextStartIndex` by 20, even if the page is short. An empty page returns
`{ "books": [], "nextStartIndex": null }`. Pagination does not rely on Google's
`totalItems`. Incomplete records are skipped; a page of skipped records still
advances the offset. Only real calendar dates in `YYYY-MM-DD` format are accepted;
records with partial or invalid dates are skipped. Descriptions are optional; source
HTML is converted to plain text and blank descriptions are omitted. Malformed
responses cause an error. The client retains nullable metadata for compatibility.

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

## Server tests

Run the server service unit tests and Express API integration tests with Vitest:

```bash
npm test --prefix server
npm run test:typecheck --prefix server
```

Use `npm run test:watch --prefix server` for watch mode. Tests use mocked Google
responses and an ephemeral loopback HTTP server; they need no API key or external
network access. Timeout cases use controlled abort signals rather than real delays.
Tests live under `server/tests` and are excluded from the production build.
Startup and environment validation tests are deferred.

## Linting and formatting

The client uses ESLint, and the server uses Oxlint to support its TypeScript 7
compiler. Both projects use Prettier for formatting. Client linting also checks
Angular inline and external templates, including accessibility rules.
The setup follows the [typescript-eslint recommended configuration](https://typescript-eslint.io/getting-started/)
and [Angular ESLint configuration](https://github.com/angular-eslint/angular-eslint/blob/main/docs/CONFIGURING_ESLINT.md).

From the repository root:

```bash
npm run lint --prefix client
npm run lint --prefix server
npm run format:check --prefix client
npm run format:check --prefix server
```

Use `npm run lint:fix --prefix client` or `--prefix server` to apply automatic
lint fixes, and `npm run format --prefix client` or `--prefix server` to format
files. Generated output, dependencies, coverage, and lockfiles are excluded from
formatting.

## Builds

From the repository root:

```bash
npm run build --prefix server
npm run build --prefix client
```

After building, run the compiled API with `npm start` inside `server`.
The static client is in `client/dist/client/browser`. Production hosting must
serve it with an `index.html` fallback for client routes and forward `/api` to
Express on the same origin; the development proxy
only applies to `npm start` inside `client`.
