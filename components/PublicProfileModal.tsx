import React, { useState, useEffect } from 'react';
import { X, Twitter, Instagram, Globe as WebsiteIcon, User as UserIcon, UserPlus, UserMinus, ShieldAlert, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { galleryService, UserProfile } from '../services/galleryService';
import { auth } from '../services/firebase';

interface PublicProfileModalProps {
  uid: string;
  onClose: () => void;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({ uid, onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followersList, setFollowersList] = useState<UserProfile[]>([]);
  const [followingList, setFollowingList] = useState<UserProfile[]>([]);
  const currentUser = auth.currentUser;

  const loadFollowLists = async () => {
    // This would require new 'get-followers' and 'get-following' functions
    console.log('Loading follow lists for', uid);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await galleryService.getProfile(uid);
        setProfile(data);
        
        if (currentUser) {
          // This would require a new 'is-following' function
          console.log('Checking follow status for', currentUser.uid, uid);
          
          const myProfile = await galleryService.getProfile(currentUser.uid);
          // This would require a 'blockedUsers' field in the profile
          // setIsBlocked(myProfile.blockedUsers?.includes(uid) || false);
        }

        await loadFollowLists();
      } catch (err) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [uid, currentUser]);

  const handleFollow = async () => {
    if (!currentUser || !profile) return;
    // This would require new 'follow-user' and 'unfollow-user' functions
    console.log('Toggling follow for', uid);
  };

  const handleBlock = async () => {
    if (!currentUser || !profile) return;
    if (!window.confirm(`Block ${profile.displayName}? They won't be able to see your art and you won't see theirs.`)) return;
    // This would require a new 'block-user' function
    console.log('Blocking user', uid);
  };

  if (loading) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20 dark:border-white/5"
        onClick={e => e.stopPropagation()}
      >
        <div 
          className="relative h-32 transition-colors duration-500"
          style={{ backgroundColor: profile?.bannerColor || '#f3f4f6' }}
        >
          <button 
            onClick={onClose}
            className="absolute right-6 top-6 w-10 h-10 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md flex items-center justify-center text-zinc-500 hover:text-black dark:hover:text-white transition-all z-10"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-8 pb-8 -mt-12 relative">
          <div className="flex flex-col items-center text-center">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt="Avatar" className="w-24 h-24 rounded-full border-4 border-white dark:border-zinc-900 shadow-xl mb-4" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-zinc-300 shadow-xl mb-4">
                <UserIcon size={48} />
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">
              {profile?.displayName || 'Anonymous Artist'}
            </h2>

            <div className="mt-4 flex gap-8">
              <button 
                onClick={() => setShowFollowers(true)}
                className="text-center hover:opacity-70 transition-opacity"
              >
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{profile?.followersCount || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Followers</p>
              </button>
              <button 
                onClick={() => setShowFollowing(true)}
                className="text-center hover:opacity-70 transition-opacity"
              >
                <p className="text-lg font-bold text-zinc-900 dark:text-white">{profile?.followingCount || 0}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Following</p>
              </button>
            </div>
            
            {currentUser && currentUser.uid !== uid && (
              <div className="mt-6 flex gap-3 w-full">
                <button 
                  onClick={handleFollow}
                  className={`flex-1 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                    isFollowing 
                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400' 
                      : 'bg-black dark:bg-white text-white dark:text-black shadow-lg'
                  }`}
                >
                  {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                  {isFollowing ? 'Unfollow' : 'Follow'}
                </button>
                <button 
                  onClick={handleBlock}
                  className="px-4 h-12 rounded-2xl bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center gap-2 hover:bg-red-100 transition-all text-[10px] font-bold uppercase tracking-widest"
                  title="Block User"
                >
                  <ShieldAlert size={16} />
                  <span>Block</span>
                </button>
              </div>
            )}
            
            {profile?.bio && (
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                {profile.bio}
              </p>
            )}

            <div className="mt-8 flex gap-4">
              {profile?.socials?.twitter && (
                <a 
                  href={`https://twitter.com/${profile.socials.twitter.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-[#1DA1F2] transition-all hover:scale-110"
                >
                  <Twitter size={20} />
                </a>
              )}
              {profile?.socials?.instagram && (
                <a 
                  href={`https://instagram.com/${profile.socials.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-[#E4405F] transition-all hover:scale-110"
                >
                  <Instagram size={20} />
                </a>
              )}
              {profile?.socials?.website && (
                <a 
                  href={profile.socials.website.startsWith('http') ? profile.socials.website : `https://${profile.socials.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-2xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white transition-all hover:scale-110"
                >
                  <WebsiteIcon size={20} />
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Followers/Following List Modals */}
      <AnimatePresence>
        {(showFollowers || showFollowing) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-md"
            onClick={() => { setShowFollowers(false); setShowFollowing(false); }}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl overflow-hidden border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                <h3 className="text-lg font-bold dark:text-white">
                  {showFollowers ? 'Followers' : 'Following'}
                </h3>
                <button 
                  onClick={() => { setShowFollowers(false); setShowFollowing(false); }}
                  className="text-zinc-400 hover:text-black dark:hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {(showFollowers ? followersList : followingList).length === 0 ? (
                  <p className="text-center py-8 text-zinc-400 text-sm italic">No users found</p>
                ) : (
                  (showFollowers ? followersList : followingList).map((u) => (
                    <div 
                      key={u.uid} 
                      className="flex items-center gap-3 p-3 rounded-2xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      onClick={() => {
                        // Close current list view and navigate to new profile
                        setShowFollowers(false);
                        setShowFollowing(false);
                        // This will trigger the useEffect in the same modal if we were to just change uid,
                        // but since uid is a prop, the parent needs to change it.
                        // However, PublicProfileModal is usually opened by Gallery or Library.
                        // In this app, PublicProfileModal is a standalone modal.
                        // If we want to "navigate", we might need a way to tell the parent to change the uid.
                        // For now, let's just log it or if the parent supports it, it will work.
                        // Actually, the Gallery component manages viewingProfileUid.
                        // But PublicProfileModal doesn't have access to setViewingProfileUid.
                        // Wait, I can just use window.location or a custom event, but better to just 
                        // keep it simple for now if I can't easily change the prop.
                        // Actually, if I just change the state in the parent, it would work.
                        // But I don't have the setter here.
                        
                        // Let's just stick to fixing the "no users found" issue first.
                      }}
                    >
                      {u.photoURL ? (
                        <img src={u.photoURL} alt="User" className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <UserIcon size={18} />
                        </div>
                      )}
                      <span className="text-sm font-bold dark:text-white">{u.displayName || 'Anonymous'}</span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
