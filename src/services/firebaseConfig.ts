/**
 * Firebase Config Legacy Bridge
 * Re-exports the Zero-Leak configuration and types from /src/firebaseConfig.ts
 */
export { firebaseConfig as default } from '../firebaseConfig';
export { firebaseConfig, getFirebaseApp } from '../firebaseConfig';
export type { FirebaseConfig, FirebaseConfig as FirebaseAppConfig } from '../firebaseConfig';
