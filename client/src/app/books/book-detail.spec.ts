import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { BookDetail } from './book-detail';
import { BooksFacade } from './books.facade';
import { CoursesFacade } from '../courses/courses.facade';
import { LibraryDialogs } from '../shared/library-dialogs';

describe('book detail description', () => {
  afterEach(() => TestBed.resetTestingModule());

  for (const description of [undefined, 'First paragraph.\n\n<script>plain text</script>']) {
    it(`shows the description section only when present (${description !== undefined})`, () => {
      TestBed.configureTestingModule({
        imports: [BookDetail],
        providers: [
          provideRouter([]),
          { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: 'one' })) } },
          {
            provide: BooksFacade,
            useValue: {
              book$: () =>
                of({
                  id: 'one',
                  title: 'Book',
                  authors: ['Author'],
                  publisher: 'Publisher',
                  publishedDate: '2024-02-29',
                  description,
                }),
            },
          },
          { provide: CoursesFacade, useValue: { usingBook$: () => of([]) } },
          { provide: LibraryDialogs, useValue: {} },
        ],
      });
      const fixture = TestBed.createComponent(BookDetail);
      fixture.detectChanges();
      const paragraph = fixture.nativeElement.querySelector('.preserve-lines');
      if (description) {
        expect(paragraph.textContent).toBe(description);
        expect(paragraph.querySelector('script')).toBeNull();
      } else {
        expect(paragraph).toBeNull();
        expect(fixture.nativeElement.textContent).not.toContain('Description');
      }
    });
  }
});
