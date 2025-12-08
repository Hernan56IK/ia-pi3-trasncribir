import { initializeApp, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';

dotenv.config();

let app: App | null = null;
let db: Firestore | null = null;

/**
 * Inicializa Firebase Admin SDK
 */
export const initializeFirebase = (): void => {
  if (app) {
    return; // Ya inicializado
  }

  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (!process.env.FIREBASE_PROJECT_ID || !privateKey || !process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn('⚠️ Firebase no configurado. Algunas funcionalidades no estarán disponibles.');
      return;
    }

    app = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: privateKey,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });

    db = getFirestore(app);
    console.log('✅ Firebase inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando Firebase:', error);
    throw error;
  }
};

/**
 * Obtiene la instancia de Firestore
 */
export const getFirestoreInstance = (): Firestore => {
  if (!db) {
    initializeFirebase();
    if (!db) {
      throw new Error('Firebase no está inicializado');
    }
  }
  return db;
};

/**
 * Obtiene el email de un usuario desde Firestore
 */
export const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    const db = getFirestoreInstance();
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return userData?.email || null;
  } catch (error) {
    console.error(`Error obteniendo email de usuario ${userId}:`, error);
    return null;
  }
};

