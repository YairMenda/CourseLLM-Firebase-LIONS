// Polyfill localStorage for Node.js 25+ which has a broken implementation
import "./polyfills";

import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "demo-api-key",
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    "studio-5809901912-20ea0.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "studio-5809901912-20ea0",
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    "studio-5809901912-20ea0.appspot.com",
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:123456",
};

// Prevent re-initialization in hot-reload scenarios
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Firestore and Storage can be initialized on server (they don't use localStorage)
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);

// Track emulator connection status to prevent double connections
let emulatorsConnected = false;

/**
 * Connect to Firebase Emulators in development mode.
 * Works on both client and server side (for server actions).
 */
function connectToEmulators() {
  if (emulatorsConnected) return;

  // Only connect in development
  if (process.env.NODE_ENV === "development") {
    try {
      connectFirestoreEmulator(db, "127.0.0.1", 8080);
      connectStorageEmulator(storage, "127.0.0.1", 9199);
      emulatorsConnected = true;
      
      const env = typeof window === "undefined" ? "Server" : "Client";
      console.log(
        `✅ [${env}] Connected to Firebase Emulators (Firestore:8080, Storage:9199)`
      );
    } catch (error) {
      // Emulators might already be connected
      console.warn(
        "Emulator connection skipped (may already be connected):",
        error
      );
      emulatorsConnected = true;
    }
  }
}

// Connect to emulators immediately on module load (works for both client and server)
connectToEmulators();

export default app;
