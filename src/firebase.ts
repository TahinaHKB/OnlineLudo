import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously,
  signOut, 
  updateProfile,
  onAuthStateChanged,
  type User 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  orderBy, 
  limit, 
  serverTimestamp,
  type Unsubscribe 
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with configured databaseId
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  type Unsubscribe
};
