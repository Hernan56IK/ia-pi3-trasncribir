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

  // Verificar si las variables de entorno están configuradas
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY || !process.env.FIREBASE_CLIENT_EMAIL) {
    console.warn('⚠️ Firebase no configurado. Algunas funcionalidades no estarán disponibles.');
    return;
  }

  try {
    // Reemplazar \\n por saltos de línea reales en la clave privada
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

    // Validar formato básico de la clave privada
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----') || !privateKey.includes('-----END PRIVATE KEY-----')) {
      console.warn('⚠️ Formato de clave privada de Firebase inválido. Firebase no se inicializará.');
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
  } catch (error: any) {
    // No lanzar el error, solo registrarlo
    console.warn('⚠️ Firebase no pudo inicializarse:', error?.message || error);
    console.warn('⚠️ El servicio continuará funcionando sin Firebase. Algunas funcionalidades no estarán disponibles.');
    app = null;
    db = null;
  }
};

/**
 * Obtiene la instancia de Firestore
 */
export const getFirestoreInstance = (): Firestore | null => {
  if (!db) {
    initializeFirebase();
  }
  return db;
};

/**
 * Obtiene el email de un usuario desde Firestore
 */
export const getUserEmail = async (userId: string): Promise<string | null> => {
  try {
    if (!db) {
      return null; // Firebase no está disponible
    }
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data();
    return userData?.email || null;
  } catch (error) {
    // Silenciar errores de Firebase para no interrumpir el servicio
    return null;
  }
};



