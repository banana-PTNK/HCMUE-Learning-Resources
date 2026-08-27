/**
 * Firebase Services Bridge
 * Re-exports singleton instances from the central Zero-Leak config (/src/firebaseConfig.ts)
 */
export { app, auth, db, firebaseConfig, getFirebaseApp, getFirebaseAuth, getFirebaseDb } from '../firebaseConfig';
export type { FirebaseConfig } from '../firebaseConfig';
