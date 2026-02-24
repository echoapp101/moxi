import { Handler } from '@netlify/functions';
import { db, verifyToken } from './utils';

export const handler: Handler = async (event, context) => {
  try {
    const decodedToken = await verifyToken(event.headers.authorization);
    const { id } = JSON.parse(event.body || '{}');

    const artworkRef = db.collection('artworks').doc(id);
    const artworkDoc = await artworkRef.get();

    if (!artworkDoc.exists || artworkDoc.data()?.user.uid !== decodedToken.uid) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    await artworkRef.delete();

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error: any) {
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
