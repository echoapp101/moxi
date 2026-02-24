import { Handler } from '@netlify/functions';
import { db } from './utils';

export const handler: Handler = async (event, context) => {
  try {
    const snapshot = await db.collection('artworks').orderBy('timestamp', 'desc').limit(50).get();
    const artworks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return {
      statusCode: 200,
      body: JSON.stringify(artworks),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
