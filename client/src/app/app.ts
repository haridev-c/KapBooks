import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Store } from '@ngrx/store';
import { booksActions } from './books/books.state';

@Component({
  imports: [RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App implements OnInit {
  private readonly store = inject(Store);
  protected readonly title = signal('client');

  ngOnInit(): void {
    this.store.dispatch(booksActions.load());
  }
}
