// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyDrOFnbsIUx0WhraUhHfAB7J9jfyjorACw",
  authDomain: "public-service-request-s-fd2c2.firebaseapp.com",
  projectId: "public-service-request-s-fd2c2",
  storageBucket: "public-service-request-s-fd2c2.firebasestorage.app",
  messagingSenderId: "695705810769",
  appId: "1:695705810769:web:cbd29960798c3c3fdf0570",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app

