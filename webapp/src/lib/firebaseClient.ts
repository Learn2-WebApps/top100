import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:       process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:   process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId:        process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Lazy singleton — called only when actually needed (client-side),
// not at module load time (which would run during SSR prerendering).
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) return getApp();
  return initializeApp(firebaseConfig);
}

export function getClientAuth(): Auth      { return getAuth(getFirebaseApp()); }
export function getClientDb():   Firestore { return getFirestore(getFirebaseApp()); }
