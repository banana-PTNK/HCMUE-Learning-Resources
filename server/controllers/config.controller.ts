import { Request, Response } from 'express';

export class ConfigController {
  getFirebaseConfig(req: Request, res: Response) {
    const config = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || '',
      appId: process.env.FIREBASE_APP_ID || process.env.VITE_FIREBASE_APP_ID || '',
      apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || '',
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
      firestoreDatabaseId: process.env.FIREBASE_FIRESTORE_DATABASE_ID || process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || '',
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.VITE_FIREBASE_STORAGE_BUCKET || '',
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || process.env.VITE_FIREBASE_MEASUREMENT_ID || '',
      oAuthClientId: process.env.FIREBASE_OAUTH_CLIENT_ID || process.env.VITE_FIREBASE_OAUTH_CLIENT_ID || '',
      recaptchaSiteKey: process.env.FIREBASE_RECAPTCHA_SITE_KEY || process.env.VITE_FIREBASE_RECAPTCHA_SITE_KEY || ''
    };

    res.setHeader('Cache-Control', 'no-store, max-age=0');
    return res.json({ success: true, config });
  }
}

export const configController = new ConfigController();
