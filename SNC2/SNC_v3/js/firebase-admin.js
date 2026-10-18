import admin from 'firebase-admin';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger } from './logger.js';

let firebaseApp = null;
let firebaseAuth = null;
let firestoreDb = null;

function initFirebaseAdmin() {
  if (firebaseApp) return { auth: firebaseAuth, db: firestoreDb };
  
  const serviceAccountPath = join(process.cwd(), 'serviceAccountKey.json');
  let serviceAccount;
  try {
    serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));
  } catch (e) {
    logger.warn('[FIREBASE] serviceAccountKey.json no encontrado, usando modo local');
    return { auth: null, db: null };
  }
  
  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  firebaseAuth = admin.auth();
  firestoreDb = admin.firestore();
  
  return { auth: firebaseAuth, db: firestoreDb };
}

export function getFirebaseAuth() {
  if (!firebaseAuth) initFirebaseAdmin();
  return firebaseAuth;
}

export function getFirestoreDb() {
  if (!firestoreDb) initFirebaseAdmin();
  return firestoreDb;
}
