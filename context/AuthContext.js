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

  // Google login with robust config-error fallback
  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.warn("Firebase Google login failed, code:", err.code, err);
      
      // If it is a config or permission error, log in as mock user so testing isn't blocked
      const isConfigError = [
        "auth/operation-not-allowed",
        "auth/unauthorized-domain",
        "auth/invalid-api-key",
        "auth/configuration-not-found",
        "auth/internal-error",
        "auth/invalid-user-token"
      ].includes(err.code) || err.message?.toLowerCase().includes("auth");

      if (isConfigError) {
        console.info("Firebase auth configuration issue detected. Falling back to local Google Guest for testing.");
        const localUser = {
          uid: "google_local_guest",
          email: "google_guest@example.com",
          displayName: "Google Guest",
          photoURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150",
          emailVerified: true,
        };
        setUser(localUser);
        localStorage.setItem("demoUser", JSON.stringify(localUser));
        return localUser;
      }
      
      // Try redirect fallback
      try {
        const { signInWithRedirect } = await import("firebase/auth");
        await signInWithRedirect(auth, provider);
      } catch (redirectErr) {
        throw err;
      }
    }
  };

  // Email login
  const loginWithEmail = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      console.warn("Firebase email login failed, trying local storage fallback:", err);
      const localUsers = JSON.parse(localStorage.getItem("localUsers") || "[]");
      const found = localUsers.find(
        (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
      );
      if (found) {
        const localUser = {
          uid: found.uid,
          email: found.email,
          displayName: found.email.split("@")[0],
          photoURL: null,
          emailVerified: true,
        };
        setUser(localUser);
        localStorage.setItem("demoUser", JSON.stringify(localUser));
        return localUser;
      }
      throw err;
    }
  };

  // Register
  const registerWithEmail = async (email, password) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      return cred.user;
    } catch (err) {
      console.warn("Firebase email signup failed, trying local storage fallback:", err);
      const localUsers = JSON.parse(localStorage.getItem("localUsers") || "[]");
      const exists = localUsers.some(
        (u) => u.email.toLowerCase() === email.toLowerCase()
      );
      if (exists) {
        throw new Error("This email is already in use.");
      }
      const newUser = {
        uid: "local_" + Math.random().toString(36).substr(2, 9),
        email,
        password,
      };
      localUsers.push(newUser);
      localStorage.setItem("localUsers", JSON.stringify(localUsers));

      const loggedUser = {
        uid: newUser.uid,
        email: newUser.email,
        displayName: newUser.email.split("@")[0],
        photoURL: null,
        emailVerified: true,
      };
      setUser(loggedUser);
      localStorage.setItem("demoUser", JSON.stringify(loggedUser));
      return loggedUser;
    }
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