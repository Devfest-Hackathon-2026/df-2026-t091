import { initializeApp } from 'firebase/app';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'g-mountain.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'g-mountain',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'g-mountain.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '584300491726',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:584300491726:web:cec3d3afa91f89bb57719f',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-NYL9R1H6KG',
};

export const app = firebaseConfig.apiKey ? initializeApp(firebaseConfig) : null;

// Initialize analytics only if browser environment supports it
export let analytics = null;
if (typeof window !== 'undefined' && app) {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}
