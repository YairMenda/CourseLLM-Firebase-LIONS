/**
 * Firebase Auth - Client-only module
 * 
 * This module must only be imported from client components ("use client").
 * It handles Firebase Auth initialization and emulator connection.
 */

import { getAuth, GoogleAuthProvider, connectAuthEmulator, type Auth } from "firebase/auth";
import app from "./firebase";

let _auth: Auth | null = null;
let _googleProvider: GoogleAuthProvider | null = null;
let authEmulatorConnected = false;

/**
 * Get the Firebase Auth instance.
 * Lazily initializes auth and connects to emulator in development.
 */
export function getFirebaseAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used on the client side');
  }
  
  if (!_auth) {
    _auth = getAuth(app);
    
    // Connect to auth emulator in development
    if (process.env.NODE_ENV === 'development' && !authEmulatorConnected) {
      try {
        connectAuthEmulator(_auth, "http://127.0.0.1:9099", { disableWarnings: true });
        authEmulatorConnected = true;
        console.log("✅ Connected to Firebase Auth Emulator (9099)");
      } catch (error) {
        console.warn("Auth emulator connection skipped:", error);
        authEmulatorConnected = true;
      }
    }
  }
  
  return _auth;
}

/**
 * Get the Google Auth Provider instance.
 */
export function getGoogleProvider(): GoogleAuthProvider {
  if (typeof window === 'undefined') {
    throw new Error('GoogleAuthProvider can only be used on the client side');
  }
  
  if (!_googleProvider) {
    _googleProvider = new GoogleAuthProvider();
  }
  
  return _googleProvider;
}

// For backwards compatibility, export lazy getters
// These will throw if accessed on the server
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    return (getFirebaseAuth() as any)[prop];
  },
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_, prop) {
    return (getGoogleProvider() as any)[prop];
  },
});

