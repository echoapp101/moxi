import { auth } from './firebase';

export const subscriptionService = {
  async createCheckoutSession() {
    const user = auth.currentUser;
    if (!user) throw new Error('User not logged in');

    const idToken = await user.getIdToken();

    const response = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to create checkout session');
    }

    const data = await response.json();

    // Redirect directly to Stripe-hosted checkout
    window.location.href = data.url;
  },

  async verifySubscription(): Promise<{ proActive: boolean }> {
    const user = auth.currentUser;
    if (!user) return { proActive: false };

    const idToken = await user.getIdToken();

    const response = await fetch('/api/verify-subscription', {
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