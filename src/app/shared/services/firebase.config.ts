import { firebaseConfig } from '../../../environments/environment';

/**
 * Re-export of the active environment's Firebase config.
 *
 * The actual values live in `src/environments/environment.ts`, which is
 * gitignored. Locally, devs copy `environment.template.ts` over and fill
 * in their own values; in CI the deploy workflow generates the file from
 * repository secrets before `ng build`.
 *
 * NOTE — Firebase web config is *not* a secret in the credentials sense
 * (the apiKey is a public project identifier; Firestore rules do the
 * actual gatekeeping). We're routing it through env files for hygiene
 * and easier rotation, not to hide it.
 */
export const FIREBASE_CONFIG = firebaseConfig;

/** True if the placeholder values from the template haven't been replaced yet. */
export function isFirebaseConfigured(): boolean {
  return !FIREBASE_CONFIG.apiKey.startsWith('<')
      && !FIREBASE_CONFIG.projectId.startsWith('<');
}
