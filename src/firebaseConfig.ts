import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

/**
 * Firebase Client Configuration Interface
 * Zero Secrets / Zero Hardcoding: Strictly consumes public client identifiers via Vite environment variables (VITE_*)
 */
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
  oAuthClientId?: string;
  recaptchaSiteKey?: string;
}

/**
 * 1. Read all client configurations strictly from Vite environment variables (import.meta.env)
 */
export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
  recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || '',
};

/**
 * 2. Safe Singleton Pattern: Ensures Firebase App, Auth, and Firestore are initialized exactly once
 */
let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = getApp();
    } else {
      // Safe fallback configuration to guarantee no crash if variables are not yet populated in the environment
      const configToInit = {
        apiKey: firebaseConfig.apiKey || 'AIzaSy_MOCK_ENV_API_KEY_LOCAL',
        authDomain: firebaseConfig.authDomain || (firebaseConfig.projectId ? `${firebaseConfig.projectId}.firebaseapp.com` : 'localhost'),
        projectId: firebaseConfig.projectId || 'demo-project',
        storageBucket: firebaseConfig.storageBucket || (firebaseConfig.projectId ? `${firebaseConfig.projectId}.firebasestorage.app` : 'demo-project.appspot.com'),
        messagingSenderId: firebaseConfig.messagingSenderId || '000000000000',
        appId: firebaseConfig.appId || '1:000000000000:web:00000000000000',
        ...(firebaseConfig.measurementId ? { measurementId: firebaseConfig.measurementId } : {}),
      };
      appInstance = initializeApp(configToInit);
    }
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }
  return authInstance;
}

export function getFirebaseDb(): Firestore {
  if (!dbInstance) {
    const currentApp = getFirebaseApp();
    const dbId = firebaseConfig.firestoreDatabaseId;
    dbInstance = (dbId && dbId !== '(default)')
      ? getFirestore(currentApp, dbId)
      : getFirestore(currentApp);
  }
  return dbInstance;
}

// Export singleton instances for direct application consumption
export const app: FirebaseApp = getFirebaseApp();
export const auth: Auth = getFirebaseAuth();
export const db: Firestore = getFirebaseDb();

export default app;
