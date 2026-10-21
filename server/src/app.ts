import express from "express";
import { BooksError, PAGE_SIZE, type GoogleBooksService } from "./books.ts";

export function createApp(booksService: Pick<GoogleBooksService, "getBooks">) {
  const app = express();

  app.get("/api/books", async (req, res) => {
    const rawIndex = req.query.startIndex ?? "0";
    const startIndex = Number(rawIndex);
    if (
      typeof rawIndex !== "string" ||
      !/^(0|[1-9]\d*)$/.test(rawIndex) ||
      !Number.isSafeInteger(startIndex) ||
      !Number.isSafeInteger(startIndex + PAGE_SIZE)
    ) {
      res
        .status(400)
        .json({
          error: {
            code: "INVALID_START_INDEX",
            message:
              "startIndex must be a non-negative safe integer with room for the next page.",
          },
        });
      return;
    }
    try {
      res.json(await booksService.getBooks(startIndex));
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
