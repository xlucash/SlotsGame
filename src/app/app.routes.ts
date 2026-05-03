import { Routes } from '@angular/router';

/**
 * Top-level navigation. The lobby ("the Lodge") is the entry point;
 * each game is its own route. New games slot in here without touching
 * the rest of the shell.
 *
 * Routes lazy-load via `loadComponent` so the lobby doesn't pay for any
 * game's bundle until the player actually picks one.
 */
export const APP_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./lobby/lobby.component').then((m) => m.LobbyComponent),
    title: "Better Hunter's Lodge",
  },
  {
    path: 'hunters-cluster',
    loadComponent: () =>
      import('./features/game/game.component').then((m) => m.GameComponent),
    title: "Hunter's Cluster",
  },
  {
    path: 'yetis-pass',
    loadComponent: () =>
      import('./games/yetis-pass/game.component').then((m) => m.YetiGameComponent),
    title: "Yeti's Pass",
  },
  // Catch-all → back to the Lodge.
  { path: '**', redirectTo: '' },
];
