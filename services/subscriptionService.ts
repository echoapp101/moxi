import { auth } from './firebase';
import { loadStripe, Stripe } from '@stripe/stripe-js';

const getStripe = () => {
    return loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY!);
};

export const subscriptionService = {
    async createCheckoutSession() {
        const user = auth.currentUser;
        if (!user) throw new Error('User not logged in');

        const idToken = await user.getIdToken();

        const response = await fetch('/.netlify/functions/create-checkout-session', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${idToken}`,
            },
        });

        if (!response.ok) {
            throw new Error('Failed to create checkout session');
        }

        const { sessionId } = await response.json();
        const stripe = await getStripe();
        if (stripe) {
          await stripe.redirectToCheckout({ sessionId });
        }
    },

    async verifySubscription(): Promise<{ proActive: boolean }> {
        const user = auth.currentUser;
        if (!user) return { proActive: false };

        const idToken = await user.getIdToken();

        const response = await fetch('/.netlify/functions/verify-subscription', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${idToken}`,
            },
        });

        if (!response.ok) {
            console.error('Failed to verify subscription');
            return { proActive: false };
        }

        return response.json();
    },
};
