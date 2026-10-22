# KapBooks

Angular 22 + NgRx Store/Effects with an Express 5 wrapper for Google Books.
The list fetches up to 20 source records per page and appends more as you scroll. Each Express
request makes exactly one Google request. Each page success or failure is also
logged in the browser console.

The client uses Angular Material with a light green KapBooks theme.
KapBooks support local search and metadata CRUD; courses
are ordered book collections. All mutations live in NgRx memory: **refresh resets
created records, edits, deletions, and courses**. The server remains read-only.

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

Set `GOOGLE_BOOKS_API_KEY` in `server/.env`. 

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

## Run with Docker Compose

Install Docker with the Compose plugin. From the repository root, copy
`server/.env.example` to `server/.env` if you have not already done so, and set
`GOOGLE_BOOKS_API_KEY` in that file. Then run:

```bash
docker compose up --build -d
```

Open <http://localhost:8080>. To choose another host port, run
`CLIENT_PORT=4200 docker compose up --build -d`.

The client image builds Angular and serves its production files with Nginx,
including an `index.html` fallback for routes such as `/books` and `/courses`.
Nginx forwards `/api` requests, preserving paths and query strings, to
`server:3000` through Docker's DNS and the shared `books` network. Only the
client publishes a host port; the API is accessible through Nginx.


