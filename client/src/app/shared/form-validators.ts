import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const nonBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' && control.value.trim() ? null : { required: true };

export const authorsRequired: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value === 'string' &&
  control.value.split('\n').some((author: string) => author.trim())
    ? null
    : { required: true };
