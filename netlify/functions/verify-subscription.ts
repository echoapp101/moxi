import { Handler } from '@netlify/functions';
import admin from 'firebase-admin';

// Initialize Firebase Admin
if (!admin.apps.length) {
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT!);

const db = admin.firestore();

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const idToken = event.headers.authorization?.split('Bearer ')[1];
    if (!idToken) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      // You might want to create a user document here if it doesn't exist
      return { statusCode: 200, body: JSON.stringify({ proActive: false }) };
    }

    const userData = userDoc.data();
    return {
      statusCode: 200,
      body: JSON.stringify({ proActive: userData?.proActive || false }),
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal server error' }) };
  }
};

export { handler };
