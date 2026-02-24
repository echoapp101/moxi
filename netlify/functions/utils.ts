import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
    : undefined;

  admin.initializeApp({
    credential: serviceAccount ? admin.credential.cert(serviceAccount) : admin.credential.applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID
  });
}

export const verifyToken = async (authHeader?: string) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized');
  }
  const idToken = authHeader.split('Bearer ')[1];
  return admin.auth().verifyIdToken(idToken);
};

export const db = admin.firestore();
