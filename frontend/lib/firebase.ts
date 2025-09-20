"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInAnonymously,
  linkWithPopup,
  signOut,
  type Auth,
  type User
} from "firebase/auth";
import { getFirestore, collection, addDoc, serverTimestamp, getDocs, query, updateDoc, doc, type Firestore } from "firebase/firestore";
import { getStorage, ref, uploadBytes,uploadBytesResumable, type FirebaseStorage } from "firebase/storage";

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
export async function uploadFileAndCreateMetadata(
  userId: string, 
  file: File, 
  onProgress: (progress: number) => void
): Promise<string> {
  if (!userId) throw new Error("User not authenticated. Cannot upload file.");
  if (!file) throw new Error("No file provided for upload.");

  const docCollectionRef = collection(db, "users", userId, "documents");
  let docRef;

  try {
    // Step 1: Create Firestore metadata
    docRef = await addDoc(docCollectionRef, {
      userId,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      uploadTime: serverTimestamp(),
      uploadStatus: 'PROCESSING',
      gcsPath: '',
      statusMessage: '',
    });
  } catch (error) {
    console.error("Error creating Firestore metadata record:", error);
    throw new Error("Failed to create file metadata.");
  }

  const docId = docRef.id;
  const gcsPath = `${userId}/${docId}/${file.name}`;
  const storageRef = ref(storage, gcsPath);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL!;

  try {
    // Step 2: Upload file to GCS with progress
    await new Promise<void>((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress(Math.round(progress));
        },
        async (error) => {
          await updateDoc(docRef, { uploadStatus: 'FAILED', statusMessage: error?.message || 'GCS upload failed' });
          reject(error);
        },
        () => resolve()
      );
    });

    // Update Firestore with GCS path
    await updateDoc(docRef, { gcsPath });

    // Step 3: Call backend process_document
    const params = new URLSearchParams({
        bucket_name: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
        file_path: gcsPath,
        mime_type: file.type,
    });

    const res = await fetch(`${backendUrl}/process-document?${params.toString()}`, {
      method: "POST",
      // Body and Content-Type header are removed, as the data is now in the URL.
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Backend processing failed: ${text}`);
    }

    const result = await res.json();
    console.log("Backend processing result:", result);

    // Step 4: Mark upload as completed
    await updateDoc(docRef, { uploadStatus: 'COMPLETED', statusMessage: '' });

    return docId;

  } catch (err: unknown) {
    // Ensure we safely capture all errors
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error("Error during upload/process:", message);

    if (docRef) {
      await updateDoc(docRef, { uploadStatus: 'FAILED', statusMessage: message });
    }

    throw new Error(message);
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
  // 👇 ADD THIS NEW METHOD FOR GUEST SIGN-IN
  signInAsGuest: () => {
    if (!auth) return Promise.reject(new Error("Firebase not initialized"));
    return signInAnonymously(auth);
  },

  signInWithGoogle: () => {
    if (!auth || !googleProvider) return Promise.reject(new Error("Firebase not initialized"));
    return signInWithPopup(auth, googleProvider);
  },

  signUpWithGoogle: () => {
    if (!auth || !googleProvider) return Promise.reject(new Error("Firebase not initialized"));
    return signInWithPopup(auth, googleProvider);
  },

  linkWithGoogle: () => {
    if (!auth || !googleProvider || !auth.currentUser) {
      return Promise.reject(new Error("Firebase not initialized or no user is signed in."));
    }
    // This links the currently signed-in anonymous user with a Google account
    return linkWithPopup(auth.currentUser, googleProvider);
  },
};

// --- Exports ---
export { app, auth, db, storage };