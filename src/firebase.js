import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyD_cY--7CJ8oind-Dv7nlmMSTeYto7fPrE",
  authDomain: "invoice-maker-c4e8b.firebaseapp.com",
  projectId: "invoice-maker-c4e8b",
  storageBucket: "invoice-maker-c4e8b.firebasestorage.app",
  messagingSenderId: "640934586419",
  appId: "1:640934586419:web:fed1894d817ef48e815b46",
  measurementId: "G-LYT85514VL"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getFirestore(app)
