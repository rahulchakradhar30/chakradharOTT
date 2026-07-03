"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/firebase";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        localStorage.removeItem("demoUser");
      } else {
        const savedDemo = localStorage.getItem("demoUser");
        if (savedDemo) {
          setUser(JSON.parse(savedDemo));
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Google login
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  // Email login
  const loginWithEmail = async (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // Register
  const registerWithEmail = async (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
  };

  // Login as Demo Guest
  const loginAsDemo = () => {
    const demo = {
      uid: "demo_user_chakradhar",
      email: "demo@chakradharott.com",
      displayName: "Guest Critic",
      photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde",
      emailVerified: true
    };
    setUser(demo);
    localStorage.setItem("demoUser", JSON.stringify(demo));
    return demo;
  };

  // Logout
  const logout = async () => {
    localStorage.removeItem("demoUser");
    await signOut(auth);
  };

  // Forgot password
  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        loginAsDemo,
        logout,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}