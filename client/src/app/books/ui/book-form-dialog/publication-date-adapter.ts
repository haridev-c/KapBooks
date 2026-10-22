import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';

/** Uses complete ISO calendar dates for both typing and display. */
@Injectable()
export class PublicationDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return this.invalid();
    }
    const [year, month, day] = value.split('-').map(Number);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return this.invalid();
    const date = this.createDate(year, month - 1, 1);
    date.setDate(day);
    return date.getMonth() === month - 1 ? date : this.invalid();
  }

  override format(date: Date, displayFormat: object | string): string {
    if (displayFormat === 'input') {
      return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }
    return super.format(date, displayFormat);
  }
}
