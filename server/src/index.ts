import { createApp } from "./app.ts";
import { GoogleBooksService } from "./books.ts";

const apiKey = process.env.GOOGLE_BOOKS_API_KEY?.trim();
if (!apiKey) {
  console.error(
    "GOOGLE_BOOKS_API_KEY is required. Set it in server/.env or the environment.",
  );
  process.exit(1);
}

const app = createApp(new GoogleBooksService(apiKey));
app.listen(3000, () =>
  console.log("Books API listening on http://localhost:3000"),
);
