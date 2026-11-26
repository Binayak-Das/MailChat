import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAHoEEKgaS1v-czfe3GttDK5MHjL966_tI",
  authDomain: "binayakapi1.firebaseapp.com",
  projectId: "binayakapi1",
  storageBucket: "binayakapi1.firebasestorage.app",
  messagingSenderId: "545260037408",
  appId: "1:545260037408:web:238fff251157d866706345",
  measurementId: "G-QBZ5W91D3L"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

export default app;
