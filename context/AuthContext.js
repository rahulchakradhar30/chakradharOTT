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
  updateProfile,
} from "firebase/auth";

const AuthContext = createContext();

/* HELPER: Merge duplicate profiles (consists of moving subcollections & changing refs) */
export async function mergeUserProfiles(newUid, oldUid, email) {
  if (!newUid || !oldUid || newUid === oldUid) return;
  try {
    const { doc, getDoc, setDoc, deleteDoc, collection, getDocs, writeBatch, query, where } = await import("firebase/firestore");
    const { db } = await import("@/firebase");

    console.log(`[MERGE] Merging user profile from ${oldUid} to ${newUid} for email ${email}`);

    const oldUserRef = doc(db, "users", oldUid);
    const newUserRef = doc(db, "users", newUid);

    const [oldSnap, newSnap] = await Promise.all([
      getDoc(oldUserRef),
      getDoc(newUserRef)
    ]);

    if (oldSnap.exists()) {
      const oldData = oldSnap.data();
      const newData = newSnap.exists() ? newSnap.data() : {};

      // Merge profile properties
      await setDoc(newUserRef, {
        ...oldData,
        ...newData,
        email: email.toLowerCase(),
        updatedAt: new Date(),
      }, { merge: true });

      const batch = writeBatch(db);

      // 1. Move Wishlist subcollection
      const oldWishlistSnap = await getDocs(collection(db, "users", oldUid, "wishlist"));
      oldWishlistSnap.docs.forEach((itemDoc) => {
        const newItemRef = doc(db, "users", newUid, "wishlist", itemDoc.id);
        batch.set(newItemRef, itemDoc.data());
        batch.delete(itemDoc.ref);
      });

      // 2. Move Tickets subcollection
      const oldTicketsSnap = await getDocs(collection(db, "users", oldUid, "tickets"));
      oldTicketsSnap.docs.forEach((itemDoc) => {
        const newItemRef = doc(db, "users", newUid, "tickets", itemDoc.id);
        batch.set(newItemRef, itemDoc.data());
        batch.delete(itemDoc.ref);
      });

      await batch.commit();

      // 3. Update comments referencing old UID
      const commentsQuery = query(collection(db, "comments"), where("userId", "==", oldUid));
      const commentsSnap = await getDocs(commentsQuery);
      const commentsBatch = writeBatch(db);
      commentsSnap.docs.forEach((cDoc) => {
        commentsBatch.update(cDoc.ref, { userId: newUid });
      });
      await commentsBatch.commit();

      // 4. Update ratings referencing old UID
      const ratingsQuery = query(collection(db, "ratings"), where("userId", "==", oldUid));
      const ratingsSnap = await getDocs(ratingsQuery);
      const ratingsBatch = writeBatch(db);
      ratingsSnap.docs.forEach((rDoc) => {
        ratingsBatch.update(rDoc.ref, { userId: newUid });
      });
      await ratingsBatch.commit();

      // 5. Update views / watch history referencing old UID
      const viewsQuery = query(collection(db, "views"), where("userId", "==", oldUid));
      const viewsSnap = await getDocs(viewsQuery);
      const viewsBatch = writeBatch(db);
      viewsSnap.docs.forEach((vDoc) => {
        viewsBatch.update(vDoc.ref, { userId: newUid });
      });
      await viewsBatch.commit();

      // 6. Update support tickets (contacts) referencing old UID
      const contactsQuery = query(collection(db, "contacts"), where("userId", "==", oldUid));
      const contactsSnap = await getDocs(contactsQuery);
      const contactsBatch = writeBatch(db);
      contactsSnap.docs.forEach((conDoc) => {
        contactsBatch.update(conDoc.ref, { userId: newUid });
      });
      await contactsBatch.commit();

      // 7. Delete old user document
      await deleteDoc(oldUserRef);
      console.log(`[MERGE] Merged and deleted old profile ${oldUid}`);
    }
  } catch (err) {
    console.error("[MERGE] Error merging user profiles:", err);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Helper to unlock achievements and send real-time alerts
  const unlockAchievement = async (uid, achievementId, title, description) => {
    try {
      const { doc, getDoc, updateDoc, collection, addDoc } = await import("firebase/firestore");
      const { db } = await import("@/firebase");

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentAchievements = userData.achievements || [];
        
        if (currentAchievements.includes(achievementId)) return;

        const newAchievements = [...currentAchievements, achievementId];
        await updateDoc(userRef, { achievements: newAchievements });

        // Push real-time notification
        await addDoc(collection(db, "users", uid, "notifications"), {
          title: `Achievement Unlocked: ${title}! 🏆`,
          message: description,
          type: "achievement",
          read: false,
          createdAt: new Date(),
        });
      }
    } catch (err) {
      console.warn("Failed to unlock achievement:", err);
    }
  };

  // Helper to track and update login streaks
  const updateLoginStreak = async (uid) => {
    if (!uid) return;
    try {
      const { doc, getDoc, updateDoc } = await import("firebase/firestore");
      const { db } = await import("@/firebase");

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const now = new Date();
        
        const lastLogin = data.lastLoginAt ? (data.lastLoginAt.toDate ? data.lastLoginAt.toDate() : new Date(data.lastLoginAt)) : null;

        let currentStreak = data.loginStreak || 0;
        let longestStreak = data.longestStreak || 0;

        if (lastLogin) {
          // Calculate day differences using UTC midnights
          const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const prevDate = new Date(lastLogin.getFullYear(), lastLogin.getMonth(), lastLogin.getDate());
          const diffDays = Math.round((todayDate - prevDate) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            currentStreak += 1;
          } else if (diffDays > 1) {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }

        if (currentStreak > longestStreak) {
          longestStreak = currentStreak;
        }

        await updateDoc(userRef, {
          lastLoginAt: now,
          loginStreak: currentStreak,
          longestStreak: longestStreak,
        });

        // Award login streak achievement milestone
        if (currentStreak >= 7) {
          await unlockAchievement(uid, "weekly_streak", "Loyal Streamer", "Maintained a 7-day daily login streak!");
        }
      }
    } catch (err) {
      console.warn("Failed to update login streak:", err);
    }
  };

  // Helper to ensure a user profile document exists in Firestore (with merge checks)
  const ensureUserProfile = async (firebaseUser, provider = "google") => {
    if (!firebaseUser) return;
    try {
      const { doc, getDoc, setDoc, collection, getDocs, query, where } = await import("firebase/firestore");
      const { db } = await import("@/firebase");
      
      const emailLower = firebaseUser.email.toLowerCase();
      const userRef = doc(db, "users", firebaseUser.uid);
      const userSnap = await getDoc(userRef);
      
      // We removed the automatic merging of different UIDs to strictly enforce a SINGLE USER IDENTITY.
      // If a user gets here with a new UID but their email is already in use, it means Firebase settings
      // allowed multiple accounts. We should log a warning, as Firebase Auth should ideally be set to
      // "Link accounts that use the same email" to prevent this.
      const dupQuery = query(collection(db, "users"), where("email", "==", emailLower));
      const dupSnap = await getDocs(dupQuery);
      
      let existingProfileId = null;
      dupSnap.docs.forEach((d) => {
        if (d.id !== firebaseUser.uid) {
          existingProfileId = d.id;
        }
      });
      
      if (existingProfileId) {
        console.warn("Multiple UIDs found for the same email! A duplicate Firebase Auth account was created.");
        // We do not delete the old profile anymore. The app enforces 1 account per email via Auth settings.
      }
      
      let photoURL = firebaseUser.photoURL || "";
      if (!photoURL) {
        const seedText = firebaseUser.displayName || firebaseUser.email || "User";
        photoURL = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seedText)}`;
        try {
          await updateProfile(firebaseUser, { photoURL });
        } catch (profileErr) {
          console.warn("Failed to update auth photoURL:", profileErr);
        }
      }

      const nameParts = (firebaseUser.displayName || "Google User").split(" ");
      
      await setDoc(userRef, {
        email: emailLower,
        name: firebaseUser.displayName || "Google User",
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        photoURL: photoURL,
        authProvider: provider,
        createdAt: new Date(),
      }, { merge: true });

      // Trigger login streak check
      await updateLoginStreak(firebaseUser.uid);
    } catch (dbErr) {
      console.warn("Firestore profile save skipped on sign-in:", dbErr);
    }
  };

  useEffect(() => {
    // Process redirect sign-in result if returning from a redirect auth flow
    const checkRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          await ensureUserProfile(result.user, "google");
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
        updateLoginStreak(firebaseUser.uid);
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
      await ensureUserProfile(cred.user, "google");
      return cred.user;
    } catch (err) {
      console.warn("Firebase Google login failed, code:", err.code, err);
      if (err.code === "auth/account-exists-with-different-credential") {
        throw new Error("An account already exists with this email address. Please sign in using your Email & Password instead.");
      }
      if (err.code === "auth/popup-blocked") {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          console.error("Redirect fallback failed:", redirectErr);
          throw redirectErr;
        }
      }
      throw err;
    }
  };

  // Email login
  const loginWithEmail = async (email, password) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      // Trigger login streak
      if (cred.user) {
        await updateLoginStreak(cred.user.uid);
      }
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
    // 1. Prevent duplicate email registrations across authentication providers
    try {
      const { collection, getDocs, query, where } = await import("firebase/firestore");
      const { db } = await import("@/firebase");
      
      const dupQuery = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
      const dupSnap = await getDocs(dupQuery);
      
      if (!dupSnap.empty) {
        const existingData = dupSnap.docs[0].data();
        if (existingData.authProvider === "google") {
          throw new Error("This email is already registered using Google Sign-In. Please sign in with Google instead.");
        } else {
          throw new Error("This email is already registered. Please sign in instead.");
        }
      }
    } catch (checkErr) {
      if (checkErr.message.includes("registered")) {
        throw checkErr;
      }
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      const displayName = `${additionalData.firstName || ""} ${additionalData.lastName || ""}`.trim() || email.split("@")[0];
      const initialAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName)}`;
      
      try {
        await updateProfile(cred.user, {
          displayName,
          photoURL: initialAvatar,
        });
      } catch (profileErr) {
        console.warn("Failed to update profile name & photoURL on signup:", profileErr);
      }

      try {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/firebase");
        await setDoc(doc(db, "users", cred.user.uid), {
          email: email.toLowerCase(),
          name: displayName,
          firstName: additionalData.firstName || "",
          lastName: additionalData.lastName || "",
          photoURL: initialAvatar,
          dob: additionalData.dob || "",
          authProvider: "email",
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
        logout,
        resetPassword,
        unlockAchievement,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}