import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { provideRouter, withRouterConfig } from '@angular/router';
import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Angular 21 defaults to zoneless (NoopNgZone); native fetch() then does not trigger CD.
    // Opt into Zone so async HTTP completions update the UI (profile verify, admin dashboard).
    // withFetch() is recommended for SSR (NG02801); admin/profile still patch UI via NgZone+CDR
    // because fetch completions can land outside the zone and leave spinners stuck.
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor])),
    provideRouter(
      routes,
      withRouterConfig({
        onSameUrlNavigation: 'reload',
      }),
    ),
  ],
};
