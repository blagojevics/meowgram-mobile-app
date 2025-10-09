import React, { createContext, useContext, useEffect, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// Firebase config from environment variables
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey || "",
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain || "",
  projectId: Constants.expoConfig?.extra?.firebaseProjectId || "",
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket || "",
  messagingSenderId:
    Constants.expoConfig?.extra?.firebaseMessagingSenderId || "",
  appId: Constants.expoConfig?.extra?.firebaseAppId || "",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    profile?: { name: string; username: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const register = async (
    email: string,
    password: string,
    profile?: { name: string; username: string }
  ) => {
    const res = await createUserWithEmailAndPassword(auth, email, password);
    if (profile) {
      await updateProfile(res.user, { displayName: profile.username });
      await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        username: profile.username.toLowerCase(),
        displayName: profile.name,
        email: email,
        avatarUrl: "",
        bio: "",
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
        onboardingComplete: false,
        createdAt: serverTimestamp(),
      });
    }
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
