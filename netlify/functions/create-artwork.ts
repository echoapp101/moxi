import { Handler } from '@netlify/functions';
import { db, verifyToken } from './utils';

export const handler: Handler = async (event, context) => {
  try {
    const decodedToken = await verifyToken(event.headers.authorization);
    const userId = decodedToken.uid;
    const { imageData, user } = JSON.parse(event.body || '{}');

    if (userId !== user.uid) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    const newArtwork = {
      imageData,
      user,
      likes: 0,
      comments: [],
      timestamp: new Date().toISOString(),
    };

    const docRef = await db.collection('artworks').add(newArtwork);

    return {
      statusCode: 201,
      body: JSON.stringify({ id: docRef.id, ...newArtwork }),
    };
  } catch (error: any) {
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
