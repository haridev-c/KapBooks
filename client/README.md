# Books client

See the [project README](../README.md) for setup, API configuration, running,
and building the Angular client and Express API.

## Tests

Run from `client/` after `npm ci`:

```sh
npm test                 # Run the Vitest suite once
npm run test:watch       # Re-run tests as files change
npm run test:typecheck   # Type-check application and test code
```

Angular's unit-test builder compiles the components and initializes TestBed.
Tests run in jsdom and use mocked HTTP requests, dialogs, and intersection
observers; no API server or browser installation is required.

The suite covers book/course state and selectors, pagination and deletion
effects, HTTP requests, date parsing, form validation and reading-list ordering,
dialog orchestration, cards, lists, and detail pages. Shared fixtures and DOM
helpers live in `src/testing/`. Production builds exclude test files and helpers.
