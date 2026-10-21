import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const nonBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

export const authorsRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' &&
  control.value.split('\n').some((author: string) => author.trim())
    ? null
    : { required: true };

export type DatePrecision = 'year' | 'month' | 'day';

export function validPublishedDate(value: string, precision: DatePrecision): boolean {
  const pattern = { year: /^\d{4}$/, month: /^\d{4}-\d{2}$/, day: /^\d{4}-\d{2}-\d{2}$/ }[
    precision
  ];
  if (!pattern.test(value)) return false;
  const [year, month = 1, day = 1] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= days[month - 1];
}
