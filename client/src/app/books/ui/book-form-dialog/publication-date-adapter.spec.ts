import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { PublicationDateAdapter } from './publication-date-adapter';
describe('PublicationDateAdapter', () => {
  let adapter: PublicationDateAdapter;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [PublicationDateAdapter] });
    adapter = TestBed.inject(PublicationDateAdapter);
  });
  it.each(['2024-02-29', '2000-02-29', '0001-01-01', '9999-12-31'])('round trips %s', (value) => {
    const date = adapter.parse(value);
    expect(date).not.toBeNull();
    expect(adapter.format(date!, 'input')).toBe(value);
  });
  it.each([
    '2023-02-29',
    '1900-02-29',
    '2024-04-31',
    '2024-00-01',
    '2024-13-01',
    '2024-01-00',
    '2024-01-32',
    '0000-01-01',
    '2024-2-01',
    '2024',
    ' 2024-01-01',
    123,
    {},
  ])('rejects %j', (value) => {
    expect(adapter.isValid(adapter.parse(value)!)).toBe(false);
  });
  it.each([null, undefined, ''])('treats %j as empty', (value) => {
    expect(adapter.parse(value)).toBeNull();
  });
});
