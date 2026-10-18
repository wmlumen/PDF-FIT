import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'BB4EP60OS4Iz8f6tQzp6nuN8XoOE6mJpEXeLlRh0MSgvX1VpkRxCnrsf6K_s89ftDL0GXRNPEDzyNhM9puwVOP8',
  authDomain: 'snc511.firebaseapp.com',
  projectId: 'snc511',
  storageBucket: 'snc511.appspot.com',
  messagingSenderId: '117203898884',
  appId: '1:117203898884:web:snc-v3'
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
