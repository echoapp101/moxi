import { Handler } from '@netlify/functions';
import admin from 'firebase-admin';
import Stripe from 'stripe';

// Initialize Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_BASE64!, 'base64').toString('utf-8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

const db = admin.firestore();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

const handler: Handler = async (event, context) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let stripeEvent: Stripe.Event;

  try {
    stripeEvent = stripe.webhooks.constructEvent(event.body!, sig!, webhookSecret);
  } catch (err: any) {
    console.log(`Error message: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  switch (stripeEvent.type) {
    case 'checkout.session.completed': {
      const session = stripeEvent.data.object as Stripe.Checkout.Session;
      const uid = session.client_reference_id!;
      await db.collection('users').doc(uid).set({ proActive: true }, { merge: true });
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const uid = subscription.metadata.uid; // You'll need to add this when creating the subscription
        if (uid) {
            const proActive = subscription.status === 'active' || subscription.status === 'trialing';
            await db.collection('users').doc(uid).update({ proActive });
        }
        break;
    }
    default:
      console.log(`Unhandled event type ${stripeEvent.type}`);
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};

export { handler };
