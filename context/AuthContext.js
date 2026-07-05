"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "@/firebase";
import {
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to ensure a user profile document exists in Firestore
  const ensureUserProfile = async (firebaseUser) => {
    if (!firebaseUser) return;
    try {
      const { doc, getDoc, setDoc } = await import("firebase/firestore");
      const { db } = await import("@/firebase");
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        const nameParts = (firebaseUser.displayName || "Google User").split(" ");
        await setDoc(userRef, {
          email: firebaseUser.email,
          name: firebaseUser.displayName || "Google User",
          firstName: nameParts[0] || "",
          lastName: nameParts.slice(1).join(" ") || "",
          photoURL: firebaseUser.photoURL || "",
          createdAt: new Date(),
        });
      }
    } catch (dbErr) {
      console.warn("Firestore profile save skipped on Google sign-in:", dbErr);
    }
  };

  useEffect(() => {
    // Process redirect sign-in result if returning from a redirect auth flow
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await ensureUserProfile(result.user);
        }
      } catch (err) {
        console.error("Google redirect sign-in error:", err);
      }
    };
    
    checkRedirectResult();

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
    try {
      const cred = await signInWithPopup(auth, provider);
      await ensureUserProfile(cred.user);
      return cred.user;
    } catch (err) {
      console.warn("Firebase Google login failed, code:", err.code, err);
      
      // Fallback to redirect authentication ONLY if popups are explicitly blocked by the browser.
      if (err.code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          console.error("Redirect fallback failed:", redirectErr);
          throw redirectErr;
        }
      }
      
      // Do not redirect on standard cancel ('auth/popup-closed-by-user'), simply throw it so the login page can let the user cancel cleanly.
      throw err;
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
  const registerWithEmail = async (email, password, additionalData = {}) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/firebase");
        await setDoc(doc(db, "users", cred.user.uid), {
          email,
          firstName: additionalData.firstName || "",
          lastName: additionalData.lastName || "",
          dob: additionalData.dob || "",
          createdAt: new Date(),
        }, { merge: true });
      } catch (dbErr) {
        console.warn("Firestore profile save skipped:", dbErr);
      }

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
        firstName: additionalData.firstName || "",
        lastName: additionalData.lastName || "",
        dob: additionalData.dob || "",
      };
      localUsers.push(newUser);
      localStorage.setItem("localUsers", JSON.stringify(localUsers));

      const loggedUser = {
        uid: newUser.uid,
        email: newUser.email,
        displayName: additionalData.firstName ? `${additionalData.firstName} ${additionalData.lastName}` : newUser.email.split("@")[0],
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