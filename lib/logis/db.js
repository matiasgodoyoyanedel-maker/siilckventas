import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { PROYECTO_CLIENTE, normalizarPrivateKey, parseCuentaServicio } from './proyecto.js';

function credencialFirebase() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    return cert(parseCuentaServicio(process.env.FIREBASE_SERVICE_ACCOUNT));
  }
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    return cert({
      projectId: PROYECTO_CLIENTE,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizarPrivateKey(process.env.FIREBASE_PRIVATE_KEY)
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
      projectId: PROYECTO_CLIENTE
    });
  }
  return getFirestore();
}

export function authAdmin() {
  getDb();
  return getAuth();
}

export { FieldValue };
