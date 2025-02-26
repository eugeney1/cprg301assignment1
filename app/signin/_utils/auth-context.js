// _utils/auth-context.js
"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { auth, signInWithGoogle, signInWithGithub, signInWithApple, signInWithEmail, registerWithEmail, signInWithPhone } from "./firebase";
import { onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      await setPersistence(auth, browserLocalPersistence);

      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser); // Updates user state
        setLoading(false); // Ensures loading state is false after check
      });

      return () => unsubscribe();
    };

    initializeAuth();
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, signInWithGoogle, signInWithGithub, signInWithApple, signInWithEmail, registerWithEmail, signInWithPhone, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
