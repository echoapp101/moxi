export interface Artwork {
  id: string;
  imageData: string;
  user: any;
  likes: number;
  comments: any[];
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
  bio?: string;
  bannerColor?: string;
  socials?: any;
}

import { auth } from './firebase';

const callApi = async (endpoint: string, options: RequestInit = {}) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  const response = await fetch(`/.netlify/functions/${endpoint}`, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(errorData.error);
  }
  return response.json();
};

export const galleryService = {
  async getArtworks() {
    return callApi('get-artworks');
  },

  async createArtwork(imageData: string, user: any) {
    return callApi('create-artwork', {
      method: 'POST',
      body: JSON.stringify({ imageData, user }),
    });
  },

  async likeArtwork(id: string) {
    return callApi('like-artwork', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  async commentOnArtwork(id: string, text: string, user: any) {
    return callApi('comment-artwork', {
      method: 'POST',
      body: JSON.stringify({ id, text, user }),
    });
  },

  async deleteArtwork(id: string) {
    return callApi('delete-artwork', {
      method: 'POST',
      body: JSON.stringify({ id }),
    });
  },

  async getProfile(uid: string) {
    return callApi(`get-profile?uid=${uid}`);
  },

  async updateProfile(uid: string, profileData: any) {
    return callApi('update-profile', {
      method: 'POST',
      body: JSON.stringify({ ...profileData, uid }),
    });
  },

  onArtworksUpdate(callback: (data: any[]) => void): () => void {
    // Real-time updates would require a different approach with serverless,
    // like polling or a third-party service. For now, we'll just fetch once.
    this.getArtworks().then(callback);
    return () => {}; // Return an empty unsubscribe function
  },

  onArtworkUpdate(id: string, callback: (data: any) => void): () => void {
    // See onArtworksUpdate comment.
    return () => {};
  },

  async reportArtwork(artworkId: string, reporterId: string, reason: string) {
    // This would need a new 'report-artwork' function
    console.log('Reporting artwork', { artworkId, reporterId, reason });
    return Promise.resolve();
  },

  async unblockUser(blockerUid: string, blockedUid: string) {
    // This would need a new 'unblock-user' function
    console.log('Unblocking user', { blockerUid, blockedUid });
    return Promise.resolve();
  }
};