import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if Firebase config is valid
const isFirebaseConfigured = Object.values(firebaseConfig).every(
  (value) => value && value.length > 0
);

// Initialize Firebase only if configured
let app: FirebaseApp | undefined;
let db: Firestore;

if (isFirebaseConfigured && getApps().length === 0) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} else if (getApps().length > 0) {
  app = getApps()[0];
  db = getFirestore(app);
} else {
  // Fallback for development without Firebase
  db = {} as Firestore;
}

export { app, db, isFirebaseConfigured };
