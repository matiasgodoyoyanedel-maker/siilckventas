import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function credencialFirebase() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    return cert(typeof raw === 'string' ? JSON.parse(raw) : raw);
  }
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'siilckventasfull',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    });
  }
  return null;
}

export function getDb() {
  if (!getApps().length) {
    const credential = credencialFirebase();
    if (!credential) {
      throw new Error('Falta FIREBASE_SERVICE_ACCOUNT (o FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) en Vercel para la entrega automática.');
    }
    initializeApp({
      credential,
      projectId: process.env.FIREBASE_PROJECT_ID || 'siilckventasfull'
    });
  }
  return getFirestore();
}

export function authAdmin() {
  getDb();
  return getAuth();
}

export { FieldValue };
