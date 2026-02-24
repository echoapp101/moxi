import React, { useState, useEffect, useRef } from 'react';
import { X, User as UserIcon, Palette, Twitter, Instagram, Globe as WebsiteIcon, Save, Settings as SettingsIcon, Camera, Trash2, Mail, Lock, AlertCircle, Library, Plus, ShieldOff, UserMinus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, logout } from '../services/firebase';
import { User, updateEmail, updatePassword, deleteUser, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { galleryService, UserProfile, Artwork } from '../services/galleryService';

export const SettingsModal: React.FC<{ 
  onClose: () => void; 
  settings: any;
  onSettingsChange: (settings: any) => void;
  isPro: boolean;
  onUpgrade: () => void;
}> = ({ onClose, settings, onSettingsChange, isPro, onUpgrade }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    bio: '',
    bannerColor: '#f3f4f6',
    socials: { twitter: '', instagram: '', website: '' },
  });
  const [blockedProfiles, setBlockedProfiles] = useState<UserProfile[]>([]);
  const [userArtworks, setUserArtworks] = useState<Artwork[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account management state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  useEffect(() => {
    const currentUser = auth.currentUser;
    setUser(currentUser);
    if (currentUser) {
      setEmail(currentUser.email || '');
      galleryService.getProfile(currentUser.uid)
        .then(async (data) => {
          setProfile(data);
          if (data.blockedUsers?.length) {
            // This would require a new 'get-profile' function for each blocked user
            console.log('Fetching profiles for blocked users');
          }
        })
        .catch(() => {
          setProfile({
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            uid: currentUser.uid,
            bio: '',
            bannerColor: '#f3f4f6',
            socials: { twitter: '', instagram: '', website: '' },
            blockedUsers: []
          });
        });
    }
  }, []);

  const updateSetting = (key: string, value: boolean) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const handleUnblock = async (uid: string) => {
    if (!user) return;
    // This would require a new 'unblock-user' function
    console.log('Unblocking user', uid);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await galleryService.updateProfile(user.uid, profile);
      setAuthSuccess('Profile updated successfully!');
      setTimeout(() => setAuthSuccess(''), 3000);
    } catch (err) {
      console.error("Failed to save profile", err);
      setAuthError('Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setProfile(prev => ({ ...prev, photoURL: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateEmail = async () => {
    if (!user || !email) return;
    setAuthError('');
    setAuthSuccess('');
    try {
      await updateEmail(user, email);
      setAuthSuccess('Email updated successfully!');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleUpdatePassword = async () => {
    if (!user || !newPassword) return;
    setAuthError('');
    setAuthSuccess('');
    try {
      await updatePassword(user, newPassword);
      setAuthSuccess('Password updated successfully!');
      setNewPassword('');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    if (!window.confirm('Are you absolutely sure? This will permanently delete your account and all your data.')) return;
    
    setAuthError('');
    try {
      await deleteUser(user);
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/requires-recent-login') {
        setAuthError("Security check failed. To delete your account, you must have signed in recently. Please sign out and sign back in, then try again.");
      } else {
        setAuthError(err.message);
      }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-xl"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-zinc-900 w-full max-w-4xl h-[85vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden border border-white/20 dark:border-white/5"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
          <div className="flex gap-8">
            {['profile', 'settings'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`text-2xl font-bold tracking-tight transition-all capitalize ${activeTab === tab ? 'text-zinc-900 dark:text-white scale-105' : 'text-zinc-300 dark:text-zinc-600 hover:text-zinc-400'}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <AnimatePresence mode="wait">
            {activeTab === 'profile' && (
              <motion.div 
                key="profile-tab"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="p-8 space-y-10"
              >
                {/* Banner & Avatar */}
                <div className="relative">
                  <div 
                    className="h-48 w-full rounded-[32px] shadow-inner transition-colors duration-500 relative overflow-hidden"
                    style={{ backgroundColor: profile.bannerColor }}
                  >
                    <input 
                      type="color" 
                      value={profile.bannerColor}
                      onChange={(e) => setProfile(prev => ({ ...prev, bannerColor: e.target.value }))}
                      className="absolute bottom-4 right-4 w-10 h-10 rounded-full border-4 border-white dark:border-zinc-900 cursor-pointer overflow-hidden p-0"
                    />
                  </div>
                  <div className="absolute -bottom-10 left-8 flex items-end gap-4">
                    <div className="relative group">
                      {profile.photoURL ? (
                        <img src={profile.photoURL} alt="Avatar" className="w-28 h-28 rounded-full border-4 border-white dark:border-zinc-900 shadow-xl object-cover" />
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-zinc-100 dark:bg-zinc-800 border-4 border-white dark:border-zinc-900 flex items-center justify-center text-zinc-300 shadow-xl">
                          <UserIcon size={48} />
                        </div>
                      )}
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                      >
                        <Camera size={24} />
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-12 space-y-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Username</label>
                      <input 
                        type="text"
                        value={profile.displayName || ''}
                        onChange={(e) => setProfile(prev => ({ ...prev, displayName: e.target.value }))}
                        placeholder="Your username"
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Bio</label>
                      <textarea 
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell the world about your art..."
                        className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white min-h-[120px] resize-none"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Twitter</label>
                        <div className="relative">
                          <Twitter className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                          <input 
                            type="text"
                            value={profile.socials?.twitter || ''}
                            onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, twitter: e.target.value } }))}
                            placeholder="@username"
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Instagram</label>
                        <div className="relative">
                          <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                          <input 
                            type="text"
                            value={profile.socials?.instagram || ''}
                            onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, instagram: e.target.value } }))}
                            placeholder="@username"
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Website</label>
                        <div className="relative">
                          <WebsiteIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                          <input 
                            type="text"
                            value={profile.socials?.website || ''}
                            onChange={(e) => setProfile(prev => ({ ...prev, socials: { ...prev.socials, website: e.target.value } }))}
                            placeholder="https://..."
                            className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <div className="flex flex-col">
                        {authError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle size={12} /> {authError}</p>}
                        {authSuccess && <p className="text-emerald-500 text-[10px] font-bold uppercase tracking-wider">{authSuccess}</p>}
                      </div>
                      <button 
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-8 py-4 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-2xl text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-lg active:scale-95"
                      >
                        {isSaving ? <Save className="animate-spin" size={16} /> : <Save size={16} />}
                        Save Profile
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div 
                key="settings-tab"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="p-8 space-y-10"
              >
                {/* Account Section */}
                <section className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                    <ShieldOff size={14} className="text-indigo-500" /> Moxi Pro Subscription
                  </h3>
                  <div className="p-6 bg-indigo-50 dark:bg-indigo-900/10 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                          {isPro ? 'Moxi Pro Active' : 'Upgrade to Moxi Pro'}
                        </p>
                        <p className="text-xs text-indigo-500/60">
                          {isPro 
                            ? 'You have full access to high-res exports, custom backgrounds, and physics controls.' 
                            : 'Unlock high-res exports, remove watermarks, and customize physics for $3.99/mo.'}
                        </p>
                      </div>
                      {!isPro && (
                        <button 
                          onClick={onUpgrade}
                          className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg active:scale-95"
                        >
                          Upgrade Now
                        </button>
                      )}
                      {isPro && (
                        <div className="px-4 py-2 bg-indigo-100 dark:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-bold uppercase tracking-widest">
                          Active
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* Account Section */}
                <section className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                    <UserIcon size={14} /> Account Management
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                          <input 
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none dark:text-white"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdateEmail}
                        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                      >
                        Update Email
                      </button>
                    </div>

                    <div className="space-y-4 p-6 bg-zinc-50 dark:bg-zinc-800/50 rounded-3xl border border-zinc-100 dark:border-zinc-800">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 ml-2">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={14} />
                          <input 
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-10 pr-4 py-3 text-sm focus:outline-none dark:text-white"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={handleUpdatePassword}
                        className="w-full py-3 bg-zinc-900 dark:bg-white text-white dark:text-black rounded-xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                      >
                        Update Password
                      </button>
                    </div>
                  </div>
                </section>

                {/* Preferences Section */}
                <section className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                    <Palette size={14} /> Studio Preferences
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingsToggle 
                      label="Dark Mode" 
                      description="Switch to a darker interface" 
                      enabled={settings.darkMode} 
                      onChange={(val) => updateSetting('darkMode', val)}
                    />
                    <SettingsToggle 
                      label="High Fidelity" 
                      description="Enable 1024x1024 grid" 
                      enabled={settings.highFidelity} 
                      onChange={(val) => updateSetting('highFidelity', val)}
                    />
                  </div>
                </section>

                {/* Blocked Users Section */}
                {blockedProfiles.length > 0 && (
                  <section className="space-y-6">
                    <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-2">
                      <ShieldOff size={14} /> Blocked Users
                    </h3>
                    <div className="space-y-3">
                      {blockedProfiles.map((p) => (
                        <div key={p.uid} className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-2xl border border-zinc-100 dark:border-zinc-800">
                          <div className="flex items-center gap-3">
                            {p.photoURL ? (
                              <img src={p.photoURL} alt="Avatar" className="w-8 h-8 rounded-full" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-zinc-400">
                                <UserIcon size={14} />
                              </div>
                            )}
                            <span className="text-sm font-bold text-zinc-900 dark:text-white">{p.displayName || 'Anonymous'}</span>
                          </div>
                          <button 
                            onClick={() => handleUnblock(p.uid)}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50 transition-all"
                          >
                            <UserMinus size={12} />
                            Unblock
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Danger Zone */}
                <section className="space-y-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-red-400 flex items-center gap-2">
                    <Trash2 size={14} /> Danger Zone
                  </h3>
                  <div className="p-6 bg-red-50 dark:bg-red-900/10 rounded-3xl border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-red-600 dark:text-red-400">Delete Account</p>
                        <p className="text-xs text-red-500/60">Permanently remove your account and all artworks.</p>
                      </div>
                      <button 
                        onClick={handleDeleteAccount}
                        className="px-6 py-3 bg-red-600 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg active:scale-95"
                      >
                        Delete Forever
                      </button>
                    </div>
                    {authError && <p className="mt-4 text-red-500 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><AlertCircle size={12} /> {authError}</p>}
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-8 bg-zinc-50 dark:bg-zinc-800/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
          <button 
            onClick={() => {
              logout();
              onClose();
            }}
            className="px-6 py-3 text-red-500 font-bold text-xs uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            Sign Out
          </button>
          <button 
            onClick={onClose}
            className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black font-bold text-xs uppercase tracking-widest rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg active:scale-95"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const SettingsToggle: React.FC<{ label: string; description: string; enabled: boolean; onChange: (val: boolean) => void }> = ({ label, description, enabled, onChange }) => {
  return (
    <div 
      onClick={() => onChange(!enabled)}
      className="p-4 bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 rounded-2xl flex items-center justify-between group hover:border-zinc-200 dark:hover:border-zinc-700 transition-all cursor-pointer"
    >
      <div className="min-w-0">
        <p className="text-sm font-bold text-zinc-900 dark:text-white">{label}</p>
        <p className="text-[10px] text-zinc-400 truncate">{description}</p>
      </div>
      <div 
        className={`w-10 h-5 rounded-full transition-all relative ${enabled ? 'bg-black dark:bg-white' : 'bg-zinc-200 dark:bg-zinc-700'}`}
      >
        <motion.div 
          animate={{ x: enabled ? 22 : 2 }}
          className={`absolute top-1 w-3 h-3 rounded-full shadow-sm ${enabled ? 'bg-white dark:bg-black' : 'bg-white'}`}
        />
      </div>
    </div>
  );
};

const ChevronRight = ({ size, className }: { size: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);
