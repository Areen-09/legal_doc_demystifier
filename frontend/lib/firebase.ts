"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  type Auth,
  type User
} from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, updateDoc, type Firestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes, type FirebaseStorage } from "firebase/storage";

// --- Firebase Config from .env ---
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// --- Safer Initialization ---
let app: FirebaseApp;
let auth: Auth;
let googleProvider: GoogleAuthProvider;
let db: Firestore;
let storage: FirebaseStorage;

const configIsValid = Object.values(firebaseConfig).every(Boolean);

if (configIsValid) {
  app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  console.warn("Firebase config is missing or incomplete. Firebase will not be initialized.");
}

/**
 * Handles the file upload process according to the implementation blueprint.
 * 1. Creates a metadata document in Firestore with status 'PROCESSING'.
 * 2. Uploads the file to a structured GCS path containing the user and document ID.
 * 3. Updates the metadata with the GCS path and handles success/failure states.
 * @param {string} userId - The UID of the authenticated user.
 * @param {File} file - The file to be uploaded.
 * @returns {Promise<string>} The document ID of the created metadata record.
 */
export async function uploadFileAndCreateMetadata(userId: string, file: File): Promise<string> {
  if (!userId) {
    throw new Error("User not authenticated. Cannot upload file.");
  }
  if (!file) {
    throw new Error("No file provided for upload.");
  }

  // 1. Create the initial metadata record in Firestore [cite: 219]
  const docCollectionRef = collection(db, "users", userId, "documents");
  
  let docRef;
  try {
    docRef = await addDoc(docCollectionRef, {
      userId: userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadTime: serverTimestamp(),
      uploadStatus: 'PROCESSING', // Initial status as per the blueprint [cite: 219]
      gcsPath: '',
    });
  } catch (error) {
    console.error("Error creating Firestore metadata record:", error);
    throw new Error("Failed to create file metadata.");
  }

  // 2. Upload the file to a structured path in GCS [cite: 207]
  const docId = docRef.id;
  const gcsPath = `${userId}/${docId}/${file.name}`;// Path includes userId and docId [cite: 207]
  const storageRef = ref(storage, gcsPath);

  try {
    await uploadBytes(storageRef, file);

    // 4. Update the Firestore document with the GCS path upon success
    await updateDoc(docRef, {
      gcsPath: gcsPath,
    });

    console.log(`Successfully uploaded ${file.name} and created metadata with ID: ${docId}`);
    return docId;

  } catch (error) {
    // 5. If upload fails, update the status to 'FAILED' [cite: 237]
    console.error("Error uploading file to GCS:", error);
    await updateDoc(docRef, {
      uploadStatus: 'FAILED',
    });
    throw new Error("File upload failed.");
  }
}


// Get documents for a user
export async function getUserDocuments(userId: string) {
  if (!userId) throw new Error("User not authenticated");

  const q = query(collection(db, "users", userId, "documents"));
  const snap = await getDocs(q);

  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}


// --- Auth API Wrapper ---
export const firebaseAuthApi = {
  onChange: (callback: (user: User | null) => void) => {
    if (!auth) return () => {};
    return onAuthStateChanged(auth, callback);
  },

  signOut: () => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized"));
    return signOut(auth);
  },

  signInWithGoogle: () => {
    if (!auth || !googleProvider) return Promise.reject(new Error("Firebase not initialized"));
    return signInWithPopup(auth, googleProvider);
  },

  signUpWithGoogle: () => {
    if (!auth || !googleProvider) return Promise.reject(new Error("Firebase not initialized"));
    return signInWithPopup(auth, googleProvider);
  },
};

// --- Exports ---
export { app, auth, db, storage };