// src/lib/firebase.ts
// Inicializacija Firebase za FieldBill aplikacijo
// Bere konfiguracijo iz .env.local in pripravi povezave do Auth, Firestore in Storage.

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Konfiguracija iz .env.local (vrednosti morajo začeti z NEXT_PUBLIC_ za vidnost v brskalniku)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Inicializiraj Firebase samo enkrat (singleton pattern)
// V Next.js dev mode-u se modul lahko zaganja večkrat - to prepreči duplikate.
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Izvozimo posamezne Firebase storitve, da jih lahko uvozi katerakoli komponenta
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export default app;