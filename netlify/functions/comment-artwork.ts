import { Handler } from '@netlify/functions';
import { db, verifyToken } from './utils';
import * as admin from 'firebase-admin';

export const handler: Handler = async (event, context) => {
  try {
    const decodedToken = await verifyToken(event.headers.authorization);
    const { id, text, user } = JSON.parse(event.body || '{}');

    if (decodedToken.uid !== user.uid) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    const artworkRef = db.collection('artworks').doc(id);
    const newComment = {
      id: new Date().toISOString(),
      text,
      user,
      timestamp: new Date().toISOString(),
    };

    await artworkRef.update({
      comments: admin.firestore.FieldValue.arrayUnion(newComment),
    });

    return { statusCode: 200, body: JSON.stringify(newComment) };
  } catch (error: any) {
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
