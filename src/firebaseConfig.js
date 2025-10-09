import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtcM0llScwdxsa-qu1NoLWur1W57uz76I",
  authDomain: "campus-lost-and-found-app.firebaseapp.com",
  projectId: "campus-lost-and-found-app",
  storageBucket: "campus-lost-and-found-app.appspot.com",
  messagingSenderId: "915421102877",
  appId: "1:915421102877:web:82e3f2a3678d67760817f4",
  measurementId: "G-493DSFHDD4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Firestore
export const db = getFirestore(app);

// Storage
export const storage = getStorage(app);

// Auth
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
