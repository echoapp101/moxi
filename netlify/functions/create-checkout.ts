import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { verifyToken } from './utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: '2026-01-28.clover',
});

export const handler: Handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const decodedToken = await verifyToken(event.headers.authorization);
    const userId = decodedToken.uid;
    const email = decodedToken.email;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_1T4AFIIzZts9CiMKY4bsPL8v',
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/`,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
        userId: userId
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error: any) {
    return {
      statusCode: error.message === 'Unauthorized' ? 401 : 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
