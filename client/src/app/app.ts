import { Component, inject, signal } from '@angular/core';
import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { map } from 'rxjs';

@Component({
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatButtonModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatExpansionModule,
  ],
  selector: 'app-root',
  template: `
    <a class="skip-link" href="#main-content">Skip to content</a>
    <mat-toolbar class="app-toolbar">
      <button
        mat-button
        (click)="toggleMenu()"
        aria-label="Toggle navigation"
        [attr.aria-expanded]="mobile() ? mobileOpen() : desktopOpen()"
        aria-controls="app-navigation"
      >
        Menu
      </button>
      <a class="brand" routerLink="/books" aria-label="KapBooks home">
        <span class="brand-mark" aria-hidden="true">K</span>
        <span>KapBooks</span>
      </a>
      <span class="toolbar-caption">Your learning library</span>
    </mat-toolbar>
    <mat-sidenav-container>
      <mat-sidenav
        id="app-navigation"
        [mode]="mobile() ? 'over' : 'side'"
        [opened]="mobile() ? mobileOpen() : desktopOpen()"
        (closedStart)="mobileOpen.set(false)"
      >
        <nav aria-label="Main navigation">
          <p class="nav-caption">YOUR WORKSPACE</p>
          <mat-accordion>
            <mat-expansion-panel [expanded]="true" class="navigation-panel">
              <mat-expansion-panel-header
                ><mat-panel-title>Content Management</mat-panel-title></mat-expansion-panel-header
              >
              <mat-nav-list>
                <a
                  mat-list-item
                  routerLink="/books"
                  routerLinkActive="active"
                  #booksLink="routerLinkActive"
                  [activated]="booksLink.isActive"
                  ariaCurrentWhenActive="page"
                  (click)="closeMobile()"
                  >Books</a
                >
              </mat-nav-list>
            </mat-expansion-panel>
          </mat-accordion>
          <mat-nav-list>
            <a
              mat-list-item
              routerLink="/courses"
              routerLinkActive="active"
              #coursesLink="routerLinkActive"
              [activated]="coursesLink.isActive"
              ariaCurrentWhenActive="page"
              (click)="closeMobile()"
              >Courses</a
            >
          </mat-nav-list>
        </nav>
      </mat-sidenav>
      <mat-sidenav-content>
        <main id="main-content" tabindex="-1"><router-outlet /></main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    :host {
      display: block;
    }
    .app-toolbar {
      position: sticky;
      top: 0;
      z-index: 3;
      gap: 16px;
      background: linear-gradient(110deg, #dcefdc, #edf6e8);
      color: #1e4933;
      border-bottom: 1px solid #c3d9c7;
      box-shadow: 0 2px 12px #234b3210;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      color: inherit;
      text-decoration: none;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .brand-mark {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      border-radius: 12px 4px 12px 4px;
      background: #2e6848;
      color: #fff;
      font-size: 22px;
    }
    .toolbar-caption {
      margin-left: auto;
      font-size: 13px;
      font-weight: 400;
      color: #496653;
    }
    mat-sidenav-container {
      min-height: calc(100dvh - 64px);
      overflow: visible;
    }
    mat-sidenav {
      width: 280px;
      position: fixed;
      top: 64px;
      background: #edf5eb;
      border-right: 1px solid #d4e3d2;
      border-radius: 0;
    }
    mat-sidenav-content {
      overflow: visible;
      min-height: calc(100dvh - 64px);
    }
    main {
      max-width: 1440px;
      margin: auto;
      padding: 32px;
    }
    main:focus {
      outline: none;
    }
    nav {
      padding: 24px 12px;
    }
    .nav-caption {
      margin: 0 16px 20px;
      color: #536e59;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 1.5px;
    }
    .navigation-panel {
      box-shadow: none;
      background: transparent;
    }
    mat-panel-title {
      color: #2d5037;
      font-weight: 600;
    }
    mat-nav-list a {
      margin-bottom: 4px;
    }
    mat-nav-list a.active {
      background: #cfe6cb;
      font-weight: 600;
    }
    @media (max-width: 767px) {
      main {
        padding: 20px 16px;
      }
    }
    @media (max-width: 599px) {
      .toolbar-caption {
        display: none;
      }
      mat-sidenav {
        top: 56px;
      }
      mat-sidenav-container,
      mat-sidenav-content {
        min-height: calc(100dvh - 56px);
      }
    }
  `,
})
export class App {
  readonly mobile = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 767px)')
      .pipe(map((result) => result.matches)),
    { initialValue: false },
  );
  readonly desktopOpen = signal(true);
  readonly mobileOpen = signal(false);
  toggleMenu() {
    this.mobile()
      ? this.mobileOpen.update((open) => !open)
      : this.desktopOpen.update((open) => !open);
  }
  closeMobile() {
    this.mobileOpen.set(false);
  }
}
