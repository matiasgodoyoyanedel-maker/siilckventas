import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { PROYECTO_CLIENTE, normalizarPrivateKey, parseCuentaServicio } from './proyecto.js';

export function diagnosticoFirebase(env = process.env) {
  const json = String(env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  const email = String(env.FIREBASE_CLIENT_EMAIL || '').trim();
  const key = normalizarPrivateKey(env.FIREBASE_PRIVATE_KEY || '');
  const tieneJson = json.startsWith('{');
  const tieneKey = key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY') && key.length > 500 && !!email;
  const projectId = String(env.FIREBASE_PROJECT_ID || '').trim() || PROYECTO_CLIENTE;
  return { ok: tieneJson || tieneKey, tieneJson, tieneKey, email: !!email, projectId: !!projectId };
}

function credencialFirebase() {
  const json = String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim();
  if (json.startsWith('{')) {
    try {
      return cert(parseCuentaServicio(json));
    } catch (e) {
      console.error(JSON.stringify({ evento: 'firebase_json_invalido', error: String(e.message || '').slice(0, 180) }));
    }
  }
  const key = normalizarPrivateKey(process.env.FIREBASE_PRIVATE_KEY || '');
  const email = String(process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const projectId = String(process.env.FIREBASE_PROJECT_ID || '').trim() || PROYECTO_CLIENTE;
  const keyCompleta = key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY') && key.length > 500;
  if (keyCompleta && email && projectId) {
    return cert({ projectId, clientEmail: email, privateKey: key });
  }
  return null;
}

function errorCredencialFirebase() {
  const falta = [];
  if (!String(process.env.FIREBASE_CLIENT_EMAIL || '').trim()) falta.push('FIREBASE_CLIENT_EMAIL');
  const keyInforme = normalizarPrivateKey(process.env.FIREBASE_PRIVATE_KEY || '');
  if (!(keyInforme.includes('BEGIN PRIVATE KEY') && keyInforme.includes('END PRIVATE KEY') && keyInforme.length > 500)) falta.push('FIREBASE_PRIVATE_KEY');
  if (!String(process.env.FIREBASE_PROJECT_ID || '').trim() && !PROYECTO_CLIENTE) falta.push('FIREBASE_PROJECT_ID');
  if (!String(process.env.FIREBASE_SERVICE_ACCOUNT || '').trim().startsWith('{') && falta.length) {
    return `Faltan las llaves de Firebase en Vercel Production: ${falta.join(', ')}. FIREBASE_PRIVATE_KEY debe incluir -----BEGIN PRIVATE KEY-----.`;
  }
  return 'Falta FIREBASE_SERVICE_ACCOUNT (o FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) en Vercel para la entrega automática.';
}

export function getDb() {
  if (!getApps().length) {
    const credential = credencialFirebase();
    if (!credential) {
      throw new Error(errorCredencialFirebase());
    }
    initializeApp({
      credential,
      projectId: PROYECTO_CLIENTE || String(process.env.FIREBASE_PROJECT_ID || '').trim()
    });
  }
  return getFirestore();
}

export function authAdmin() {
  getDb();
  return getAuth();
}

export { FieldValue };
