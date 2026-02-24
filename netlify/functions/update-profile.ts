import { Handler } from '@netlify/functions';
import { db, verifyToken } from './utils';

export const handler: Handler = async (event, context) => {
  try {
    const decodedToken = await verifyToken(event.headers.authorization);
    const userId = decodedToken.uid;
    const profileData = JSON.parse(event.body || '{}');

    if (userId !== profileData.uid) {
      return { statusCode: 403, body: 'Forbidden' };
    }

    await db.collection('users').doc(userId).set(profileData, { merge: true });

    return { statusCode: 200, body: JSON.stringify({ success: true }) };
  } catch (error: any) {
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
