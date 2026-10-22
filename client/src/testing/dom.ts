import { ComponentFixture } from '@angular/core/testing';

export function element<T extends Element = HTMLElement>(
  fixture: ComponentFixture<unknown>,
  selector: string,
): T {
  const root: HTMLElement = fixture.nativeElement;
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error(`Missing element: ${selector}`);
  return found;
}
export function text(fixture: ComponentFixture<unknown>): string {
  const root: HTMLElement = fixture.nativeElement;
  return root.textContent ?? '';
}
export function enter(fixture: ComponentFixture<unknown>, selector: string, value: string) {
  const input = element<HTMLInputElement>(fixture, selector);
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  fixture.detectChanges();
}
export function click(fixture: ComponentFixture<unknown>, label: string) {
  const root: HTMLElement = fixture.nativeElement;
  const button = [...root.querySelectorAll('button')].find((b) => b.textContent?.trim() === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  button.click();
  fixture.detectChanges();
}
