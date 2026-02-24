import { Handler } from '@netlify/functions';
import { db } from './utils';

export const handler: Handler = async (event, context) => {
  try {
    const { uid } = event.queryStringParameters;
    if (!uid) return { statusCode: 400, body: 'Missing uid' };

    const userDoc = await db.collection('users').doc(uid).get();

    if (!userDoc.exists) {
      return { statusCode: 404, body: 'Profile not found' };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(userDoc.data()),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
