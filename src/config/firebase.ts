import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase web API keys are NOT secrets — security is enforced by Firebase Security Rules.
// Env vars are used when available (CI/CD), otherwise fallback to project defaults.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyBqWF22fOfoKdlxQniIxDLPCFQq4ZMm4c0",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "stitch-system-9k4.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "stitch-system-9k4",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "stitch-system-9k4.firebasestorage.app",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "518049576195",
    appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:518049576195:web:ec7f3a523822a0eda4e536",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
