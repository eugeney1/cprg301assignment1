"use client"


// _utils/auth-context.js
import { createContext, useContext, useState, useEffect } from "react";
import { auth, signInWithGoogle, signInWithGithub, signInWithApple, signInWithEmail, registerWithEmail, signInWithPhone } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  const logout = async () => await signOut(auth);

  return (
    <AuthContext.Provider
      value={{
        user,
        signInWithGoogle,
        signInWithGithub,
        signInWithApple,
        signInWithEmail,
        registerWithEmail,
        signInWithPhone,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
