/**
 * Firebase configuration detection (SDK-free).
 *
 * Sign-in + cross-device progress sync are OPTIONAL and powered by Firebase
 * (Auth email-link + Firestore). Like `realtimeConfig.ts`, this module must NOT
 * import the Firebase SDK — it only reads env vars, so the SDK can be code-split
 * into a lazily-loaded chunk and never ships in the anonymous/main bundle.
 *
 * All of these values are public client config (safe to expose in a build).
 */

const apiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined;
const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined;
const appId = import.meta.env.VITE_FIREBASE_APP_ID as string | undefined;
const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as
  | string
  | undefined;
const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as
  | string
  | undefined;

export const isFirebaseConfigured = Boolean(apiKey && authDomain && projectId && appId);

export const firebaseConfig = isFirebaseConfigured
  ? { apiKey, authDomain, projectId, appId, storageBucket, messagingSenderId }
  : null;
