import express from "express";
import { z } from "zod";
import { BooksError, PAGE_SIZE, type GoogleBooksService } from "./books.ts";

const startIndexSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .default("0")
  .transform(Number)
  .refine(
    (value) =>
      Number.isSafeInteger(value) && Number.isSafeInteger(value + PAGE_SIZE),
  );

export function createApp(booksService: Pick<GoogleBooksService, "getBooks">) {
  const app = express();

  app.get("/api/books", async (req, res) => {
    const startIndex = startIndexSchema.safeParse(req.query.startIndex);
    if (!startIndex.success) {
      res.status(400).json({
        error: {
          code: "INVALID_START_INDEX",
          message:
            "startIndex must be a non-negative safe integer with room for the next page.",
        },
      });
      return;
    }
    try {
      res.json(await booksService.getBooks(startIndex.data));
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
