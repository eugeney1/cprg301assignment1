// _utils/firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  setPersistence,
  browserLocalPersistence
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error("Error setting persistence:", error);
});

// Authentication Providers
const googleProvider = new GoogleAuthProvider();
const githubProvider = new GithubAuthProvider();
const appleProvider = new OAuthProvider("apple.com");

// Authentication Functions
const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error) {
    console.error("Google sign-in error:", error.message);
  }
};

const signInWithGithub = async () => {
  try {
    return await signInWithPopup(auth, githubProvider);
  } catch (error) {
    console.error("GitHub sign-in error:", error.message);
  }
};

const signInWithApple = async () => {
  try {
    return await signInWithPopup(auth, appleProvider);
  } catch (error) {
    console.error("Apple sign-in error:", error.message);
  }
};

const signInWithEmail = async (email, password) => {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Email sign-in error:", error.message);
  }
};

const registerWithEmail = async (email, password) => {
  try {
    return await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    console.error("Registration error:", error.message);
  }
};

const signInWithPhone = async (phoneNumber, appVerifier) => {
  try {
    return await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
  } catch (error) {
    console.error("Phone sign-in error:", error.message);
  }
};

export {
  auth,
  signInWithGoogle,
  signInWithGithub,
  signInWithApple,
  signInWithEmail,
  registerWithEmail,
  signInWithPhone
};
