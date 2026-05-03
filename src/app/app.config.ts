import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { APP_ROUTES } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Hash routing so the static GitHub Pages host can serve sub-routes
    // (`/#/hunters-cluster` etc.) without any 404-fallback gymnastics.
    provideRouter(APP_ROUTES, withHashLocation()),
  ],
};
