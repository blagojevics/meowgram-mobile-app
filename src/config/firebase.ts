import { initializeApp, getApps } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if it hasn't been initialized yet
const app =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence for React Native
let auth: any;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
} catch (error) {
  // If initializeAuth fails, it means auth is already initialized
  // This can happen in development with hot reloading
  auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);
export const storage = getStorage(app);
