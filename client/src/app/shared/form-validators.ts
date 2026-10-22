import { pattern, required, SchemaPath } from '@angular/forms/signals';

/** Require at least one non-whitespace character, including in multiline fields. */
export function nonBlank(path: SchemaPath<string>) {
  required(path);
  pattern(path, /\S/);
}
