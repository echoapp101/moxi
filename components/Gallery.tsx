import React, { useEffect, useState } from 'react';
import { Heart, MessageCircle, Send, X, User as UserIcon, Flag, AlertTriangle, Download } from 'lucide-react';
import { Artwork, galleryService } from '../services/galleryService';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../services/firebase';
import { PublicProfileModal } from './PublicProfileModal';

export const Gallery: React.FC<{ onClose: () => void; isPro: boolean }> = ({ onClose, isPro }) => {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [commentText, setCommentText] = useState<{ [key: string]: string }>({});
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [filter, setFilter] = useState<'new' | 'top'>('new');
  const [viewingProfileUid, setViewingProfileUid] = useState<string | null>(null);
  const [reportingArtworkId, setReportingArtworkId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [blockedUids, setBlockedUids] = useState<string[]>([]);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (currentUser) {
      galleryService.getProfile(currentUser.uid).then(p => {
        setBlockedUids(p.blockedUsers || []);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    const unsubscribe = galleryService.onArtworksUpdate((data) => {
      // Filter out blocked users
      const filtered = data.filter(a => !blockedUids.includes(a.user.uid));
      
      if (filter === 'top') {
        setArtworks([...filtered].sort((a, b) => b.likes - a.likes));
      } else {
        setArtworks(filtered);
      }
    });
    return () => unsubscribe();
  }, [filter, blockedUids]);

  useEffect(() => {
    if (selectedArtwork) {
      const unsubscribe = galleryService.onArtworkUpdate(selectedArtwork.id, (updated) => {
        setSelectedArtwork(updated);
        setArtworks(prev => prev.map(a => a.id === updated.id ? updated : a));
      });
      return () => unsubscribe();
    }
  }, [selectedArtwork?.id]);

  const handleLike = (id: string) => {
    if (!currentUser) {
      alert("Please sign in to like artworks.");
      return;
    }
    
    // Optimistic update
    setArtworks(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, likes: a.likes + 1 };
      }
      return a;
    }));
    
    if (selectedArtwork?.id === id) {
      setSelectedArtwork(prev => prev ? { ...prev, likes: prev.likes + 1 } : null);
    }

    galleryService.likeArtwork(id);
  };

  const handleDownload = async (artwork: Artwork) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = artwork.imageData;
    
    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let targetWidth = img.width;
    let targetHeight = img.height;

    // Restriction for non-pro
    if (!isPro) {
      const maxDim = 512;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        const ratio = Math.min(maxDim / targetWidth, maxDim / targetHeight);
        targetWidth *= ratio;
        targetHeight *= ratio;
      }
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    if (!isPro) {
      ctx.save();
      ctx.font = 'bold 24px Inter, sans-serif';
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.textAlign = 'center';
      ctx.fillText('MOXI', targetWidth / 2, targetHeight - 40);
      ctx.restore();
    }

    const link = document.createElement('a');
    link.download = `moxi-artwork-${artwork.id}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleComment = async (id: string) => {
    const text = commentText[id];
    const user = auth.currentUser;
    if (!text?.trim() || !user) return;
    
    try {
      // Fetch latest profile info to ensure name/avatar are current
      const profile = await galleryService.getProfile(user.uid);
      
      const userInfo = {
        displayName: profile.displayName || user.displayName || 'Anonymous',
        photoURL: profile.photoURL || user.photoURL,
        uid: user.uid
      };

      await galleryService.commentOnArtwork(id, text, userInfo);
      setCommentText(prev => ({ ...prev, [id]: '' }));
    } catch (err) {
      console.error("Comment failed", err);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full h-full flex flex-col bg-[#F5F5F4] dark:bg-zinc-950"
    >
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-900 flex justify-between items-center bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-12">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">Community Gallery</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mt-1">Discover inspiration from the community</p>
            </div>
            
            <div className="hidden md:flex bg-zinc-50 dark:bg-zinc-800 p-1 rounded-2xl border border-zinc-100 dark:border-zinc-700">
              <button 
                onClick={() => setFilter('new')}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === 'new' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                New
              </button>
              <button 
                onClick={() => setFilter('top')}
                className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${filter === 'top' ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'}`}
              >
                Top
              </button>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10 custom-scrollbar">
          <AnimatePresence mode="popLayout">
            {artworks.map((artwork) => (
              <motion.div 
                key={artwork.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-[0_20px_50px_rgba(0,0,0,0.04)] flex flex-col group hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] transition-all duration-500"
              >
                <div className="aspect-square bg-zinc-50 dark:bg-zinc-800 relative overflow-hidden cursor-pointer" onClick={() => setSelectedArtwork(artwork)}>
                  <img 
                    src={artwork.imageData} 
                    alt="Artwork" 
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-500" />
                </div>

                <div className="p-6 flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setViewingProfileUid(artwork.user?.uid)}
                    >
                      {artwork.user?.photoURL ? (
                        <img src={artwork.user.photoURL} alt="User" className="w-8 h-8 rounded-full border border-zinc-100 dark:border-zinc-800" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <UserIcon size={14} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p 
                        className="text-xs font-bold text-zinc-900 dark:text-white truncate cursor-pointer hover:underline"
                        onClick={() => setViewingProfileUid(artwork.user?.uid)}
                      >
                        {artwork.user?.displayName || 'Anonymous'}
                      </p>
                      <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest">
                        {new Date(artwork.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-50 dark:border-zinc-800">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => handleLike(artwork.id)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-red-500 transition-colors group/like"
                      >
                        <Heart size={20} className={artwork.likes > 0 ? 'fill-red-500 text-red-500' : 'group-hover/like:scale-110 transition-transform'} />
                        <span className="text-xs font-bold font-mono">{artwork.likes}</span>
                      </button>
                      <button 
                        onClick={() => setSelectedArtwork(artwork)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-black dark:hover:text-white transition-colors group/comment"
                      >
                        <MessageCircle size={20} className="group-hover/comment:scale-110 transition-transform" />
                        <span className="text-xs font-bold font-mono">{artwork.comments.length}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Detailed View Modal */}
      <AnimatePresence>
        {selectedArtwork && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center p-4 md:p-12 bg-black/80 backdrop-blur-2xl"
            onClick={() => setSelectedArtwork(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-6xl h-full max-h-[85vh] rounded-[40px] shadow-2xl flex flex-col md:flex-row overflow-hidden border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              {/* Image Side */}
              <div className="flex-[1.5] bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center p-8 border-r border-zinc-100 dark:border-zinc-800">
                <img 
                  src={selectedArtwork.imageData} 
                  alt="Artwork Detailed" 
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                />
              </div>

              {/* Info Side */}
              <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900">
                <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div 
                      className="cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => setViewingProfileUid(selectedArtwork.user?.uid)}
                    >
                      {selectedArtwork.user?.photoURL ? (
                        <img src={selectedArtwork.user.photoURL} alt="User" className="w-12 h-12 rounded-full border-2 border-zinc-100 dark:border-zinc-800" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
                          <UserIcon size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 
                          className="text-xl font-bold text-zinc-900 dark:text-white cursor-pointer hover:underline"
                          onClick={() => setViewingProfileUid(selectedArtwork.user?.uid)}
                        >
                          {selectedArtwork.user?.displayName || 'Anonymous'}
                        </h3>
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                        Published {new Date(selectedArtwork.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setSelectedArtwork(null)}
                    className="w-10 h-10 rounded-full bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                      <button 
                        onClick={() => handleLike(selectedArtwork.id)}
                        className="flex items-center gap-3 text-zinc-500 hover:text-red-500 transition-colors"
                      >
                        <Heart size={28} className={selectedArtwork.likes > 0 ? 'fill-red-500 text-red-500' : ''} />
                        <span className="text-lg font-bold font-mono">{selectedArtwork.likes}</span>
                      </button>
                      <div className="flex items-center gap-3 text-zinc-500">
                        <MessageCircle size={28} />
                        <span className="text-lg font-bold font-mono">{selectedArtwork.comments.length}</span>
                      </div>
                      <button 
                        onClick={() => handleDownload(selectedArtwork)}
                        className="flex items-center gap-3 text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
                        title="Download Artwork"
                      >
                        <Download size={28} />
                        <span className="text-xs font-bold uppercase tracking-widest">{isPro ? 'High-Res' : 'Standard'}</span>
                      </button>
                    </div>
                    
                    <button 
                      onClick={() => setReportingArtworkId(selectedArtwork.id)}
                      className="text-zinc-300 hover:text-red-400 transition-colors flex items-center gap-2 text-xs font-bold uppercase tracking-widest"
                      title="Report Artwork"
                    >
                      <Flag size={20} />
                      <span>Report</span>
                    </button>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-zinc-400">Comments</h4>
                    <div className="space-y-4">
                      {selectedArtwork.comments.length === 0 ? (
                        <p className="text-sm text-zinc-400 italic">No comments yet. Be the first to share your thoughts!</p>
                      ) : (
                        selectedArtwork.comments.map((comment) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            key={comment.id} 
                            className="bg-zinc-50 dark:bg-zinc-800/50 p-4 rounded-2xl border border-zinc-100 dark:border-zinc-800"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div 
                                className="cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => setViewingProfileUid(comment.user?.uid)}
                              >
                                {comment.user?.photoURL ? (
                                  <img src={comment.user.photoURL} alt="User" className="w-5 h-5 rounded-full" />
                                ) : (
                                  <UserIcon size={12} className="text-zinc-400" />
                                )}
                              </div>
                              <span 
                                className="text-[10px] font-bold text-zinc-900 dark:text-white cursor-pointer hover:underline"
                                onClick={() => setViewingProfileUid(comment.user?.uid)}
                              >
                                {comment.user?.displayName || 'Anonymous'}
                              </span>
                            </div>
                            <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{comment.text}</p>
                            <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-widest mt-2">
                              {new Date(comment.timestamp).toLocaleTimeString()}
                            </p>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/20">
                  <div className="relative flex items-center gap-3">
                    <input 
                      type="text"
                      placeholder={auth.currentUser ? "Write a comment..." : "Sign in to comment"}
                      disabled={!auth.currentUser}
                      value={commentText[selectedArtwork.id] || ''}
                      onChange={(e) => setCommentText(prev => ({ ...prev, [selectedArtwork.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && handleComment(selectedArtwork.id)}
                      className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-6 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all shadow-sm dark:text-white disabled:opacity-50"
                    />
                    <button 
                      onClick={() => handleComment(selectedArtwork.id)}
                      disabled={!auth.currentUser}
                      className="w-14 h-14 rounded-2xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingProfileUid && (
          <PublicProfileModal 
            uid={viewingProfileUid} 
            onClose={() => setViewingProfileUid(null)} 
          />
        )}
      </AnimatePresence>

      {/* Report Modal */}
      <AnimatePresence>
        {reportingArtworkId && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl"
            onClick={() => setReportingArtworkId(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-[32px] shadow-2xl p-8 border border-white/20"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 text-red-500 mb-6">
                <AlertTriangle size={24} />
                <h3 className="text-xl font-bold">Report Artwork</h3>
              </div>
              
              <p className="text-sm text-zinc-500 mb-6">Please tell us why you are reporting this artwork. Our moderators will review it shortly.</p>
              
              <textarea 
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                placeholder="Reason for reporting..."
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl p-4 text-sm focus:outline-none focus:ring-4 focus:ring-red-500/10 transition-all dark:text-white min-h-[120px] resize-none mb-6"
              />
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setReportingArtworkId(null)}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={async () => {
                    if (!reportReason.trim() || !currentUser) return;
                    await galleryService.reportArtwork(reportingArtworkId, currentUser.uid, reportReason);
                    setReportingArtworkId(null);
                    setReportReason('');
                    alert("Thank you for your report. We will review it.");
                  }}
                  className="flex-1 py-3 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20"
                >
                  Submit Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
