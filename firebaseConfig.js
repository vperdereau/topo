import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // <--- IMPORT AJOUTÉ
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: "AIzaSyBxIo603RxZY0puVjNXZLmI30A2kVlnVVA", // (Ta clé API)
  authDomain: "climbingtopo-bbf47.firebaseapp.com",
  projectId: "climbingtopo-bbf47",
  storageBucket: "climbingtopo-bbf47.firebasestorage.app",
  messagingSenderId: "622915927312",
  appId: "1:622915927312:web:99cb990026e47eb6a6b995",
  measurementId: "G-Q3R7HHDRNH"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app); // <--- LIGNE DÉ-COMMENTÉE ET EXPORTÉE
export const storage = getStorage(app);