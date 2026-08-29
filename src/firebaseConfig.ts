import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

/**
 * Firebase Client Configuration Interface
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

const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSy_MOCK_ENV_API_KEY_LOCAL',
  authDomain: 'gen-lang-client-0251983740.firebaseapp.com',
  projectId: 'gen-lang-client-0251983740',
  storageBucket: 'gen-lang-client-0251983740.firebasestorage.app',
  messagingSenderId: '222186320042',
  appId: '1:222186320042:web:studyvault-applet',
  firestoreDatabaseId: 'ai-studio-hcmuefitstudyvau-7c258ce1-cc2e-4438-b51b-7601001d8b3f',
};

/**
 * 1. Read configurations with Vite env fallback and default database info
 */
export const firebaseConfig: FirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || DEFAULT_FIREBASE_CONFIG.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || DEFAULT_FIREBASE_CONFIG.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || DEFAULT_FIREBASE_CONFIG.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || DEFAULT_FIREBASE_CONFIG.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || DEFAULT_FIREBASE_CONFIG.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || DEFAULT_FIREBASE_CONFIG.firestoreDatabaseId,
  oAuthClientId: import.meta.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
  recaptchaSiteKey: import.meta.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || '',
};

/**
 * 2. Safe Singleton Pattern: Ensures Firebase App, Auth, and Firestore are initialized safely
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
      const configToInit = {
        apiKey: firebaseConfig.apiKey || DEFAULT_FIREBASE_CONFIG.apiKey,
        authDomain: firebaseConfig.authDomain || DEFAULT_FIREBASE_CONFIG.authDomain,
        projectId: firebaseConfig.projectId || DEFAULT_FIREBASE_CONFIG.projectId,
        storageBucket: firebaseConfig.storageBucket || DEFAULT_FIREBASE_CONFIG.storageBucket,
        messagingSenderId: firebaseConfig.messagingSenderId || DEFAULT_FIREBASE_CONFIG.messagingSenderId,
        appId: firebaseConfig.appId || DEFAULT_FIREBASE_CONFIG.appId,
      };
      try {
        appInstance = initializeApp(configToInit);
      } catch {
        appInstance = getApps()[0] || initializeApp(configToInit, 'default');
      }
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
    try {
      dbInstance = (dbId && dbId !== '(default)')
        ? getFirestore(currentApp, dbId)
        : getFirestore(currentApp);
    } catch {
      dbInstance = getFirestore(currentApp);
    }
  }
  return dbInstance;
}

// Export singleton instances for direct application consumption
export const app: FirebaseApp = getFirebaseApp();
export const auth: Auth = getFirebaseAuth();
export const db: Firestore = getFirebaseDb();

export default app;
