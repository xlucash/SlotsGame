/**
 * Environment template — committed to the repo, populated by each developer
 * (and the GitHub Actions deploy job) at build time.
 *
 * LOCAL DEV:
 *   cp src/environments/environment.template.ts src/environments/environment.ts
 *   then paste the real values from
 *     https://console.firebase.google.com → Project settings → Web app
 *
 * CI: the deploy workflow writes `environment.ts` from repository secrets,
 *     so the real keys never need to live in the repo.
 *
 * NOTE — Firebase web config is *not* a secret in the credentials sense
 * (the apiKey is a public project identifier; Firestore rules do the
 * actual gatekeeping). We're env-var-ising it anyway for hygiene and
 * easier rotation; lock-down still happens in the Firebase console.
 */
export const firebaseConfig = {
  apiKey: '<API_KEY>',
  authDomain: '<PROJECT_ID>.firebaseapp.com',
  projectId: '<PROJECT_ID>',
  storageBucket: '<PROJECT_ID>.appspot.com',
  messagingSenderId: '<SENDER_ID>',
  appId: '<APP_ID>',
  measurementId: '<MEASUREMENT_ID>',
};
