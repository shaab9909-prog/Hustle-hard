import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBgkt10wM4G3tFZUFMR2JqWyVVTiq1Ab4w",
  authDomain: "zenith-study-d1e35.firebaseapp.com",
  projectId: "zenith-study-d1e35",
  storageBucket: "zenith-study-d1e35.firebasestorage.app",
  messagingSenderId: "58083821431",
  appId: "1:58083821431:web:dee2a5bbb26874924b0372",
  measurementId: "G-HD70B72ZH7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);