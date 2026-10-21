import express from "express";
import { BooksError, type GoogleBooksService } from "./books.ts";

export function createApp(booksService: Pick<GoogleBooksService, "getBooks">) {
  const app = express();

  app.get("/api/books", async (_req, res) => {
    try {
      res.json({ books: await booksService.getBooks() });
    } catch (error) {
      const failure =
        error instanceof BooksError
          ? error
          : new BooksError(
              "UPSTREAM_FAILURE",
              "Unable to fetch books from Google Books.",
            );
      res.status(failure.status).json({
        error: { code: failure.code, message: failure.message },
      });
    }
  });

  return app;
}
