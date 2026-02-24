import { Handler } from '@netlify/functions';
import { db, verifyToken } from './utils';
import * as admin from 'firebase-admin';

export const handler: Handler = async (event, context) => {
  try {
    await verifyToken(event.headers.authorization);
    const { id } = JSON.parse(event.body || '{}');
    const artworkRef = db.collection('artworks').doc(id);

    await artworkRef.update({
      likes: admin.firestore.FieldValue.increment(1),
    });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error: any) {
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
