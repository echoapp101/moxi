import React, { useState, useEffect } from 'react';
import { Library as LibraryIcon, Plus, Trash2, Globe, EyeOff, Edit3 } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../services/firebase';
import { galleryService, Artwork } from '../services/galleryService';

interface LibraryProps {
  onNewCanvas: () => void;
  onEditArtwork: (artwork: Artwork) => void;
}

export const Library: React.FC<LibraryProps> = ({ onNewCanvas, onEditArtwork }) => {
  const [userArtworks, setUserArtworks] = useState<Artwork[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) {
        setUserArtworks([]);
        setIsLoading(false);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      galleryService.getArtworks().then((artworks) => {
        setUserArtworks(artworks);
        setIsLoading(false);
      });
    }
  }, [user]);

  const handleDeleteArtwork = async (id: string) => {
    if (!window.confirm('Delete this artwork?')) return;
    try {
      await galleryService.deleteArtwork(id);
    } catch (err) {
      console.error("Failed to delete artwork", err);
      alert("Failed to delete artwork. Please try again.");
    }
  };

  const handleTogglePublish = async (id: string, currentStatus: boolean) => {
    // This would require a new 'update-artwork-visibility' function
    console.log('Toggling visibility for', id, currentStatus);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400">
          <LibraryIcon size={40} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold dark:text-white">Your Library</h2>
          <p className="text-zinc-500 max-w-xs mx-auto">Sign in to save your masterpieces and view your collection.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col p-8 md:p-12 overflow-hidden">
      <div className="flex justify-between items-center mb-12">
        <div className="space-y-1">
          <h2 className="text-4xl font-bold tracking-tighter dark:text-white">My Library</h2>
          <p className="text-zinc-400 text-sm font-medium uppercase tracking-widest">Your personal collection</p>
        </div>
        <button 
          onClick={onNewCanvas}
          className="flex items-center gap-3 px-8 py-4 bg-black dark:bg-white text-white dark:text-black rounded-[20px] text-sm font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl active:scale-95"
        >
          <Plus size={20} /> New Canvas
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-40 gap-4">
            <div className="w-10 h-10 border-4 border-zinc-200 border-t-black dark:border-t-white rounded-full animate-spin"></div>
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">Curating your gallery...</p>
          </div>
        ) : userArtworks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-40 bg-zinc-50 dark:bg-zinc-800/30 rounded-[40px] border-2 border-dashed border-zinc-200 dark:border-zinc-800">
            <LibraryIcon size={64} className="text-zinc-200 dark:text-zinc-700 mb-6" />
            <h3 className="text-xl font-bold text-zinc-400">No artworks yet</h3>
            <p className="text-xs uppercase tracking-widest text-zinc-300 mt-2">The canvas is waiting for your first stroke</p>
            <button 
              onClick={onNewCanvas}
              className="mt-8 px-6 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
            >
              Start Creating
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12">
            {userArtworks.map((artwork, index) => (
              <motion.div 
                key={artwork.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group relative aspect-square bg-white dark:bg-zinc-900 rounded-[32px] overflow-hidden border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-2xl transition-all"
              >
                <img src={artwork.imageData} alt="Artwork" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                
                {artwork.isPublic && (
                  <div className="absolute top-6 left-6 px-3 py-1 bg-emerald-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg z-10">
                    Published
                  </div>
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 flex flex-col items-center justify-center gap-4 backdrop-blur-sm">
                  <div className="flex gap-4">
                    <button 
                      onClick={() => onEditArtwork(artwork)}
                      className="w-14 h-14 rounded-full bg-blue-500 text-white flex items-center justify-center hover:bg-blue-600 transition-all transform translate-y-8 group-hover:translate-y-0 shadow-xl"
                      title="Edit"
                    >
                      <Edit3 size={24} />
                    </button>
                    <button 
                      onClick={() => handleTogglePublish(artwork.id, !!artwork.isPublic)}
                      className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform translate-y-8 group-hover:translate-y-0 shadow-xl ${
                        artwork.isPublic ? 'bg-zinc-700 text-white hover:bg-zinc-600' : 'bg-white text-black hover:bg-zinc-100'
                      }`}
                      title={artwork.isPublic ? "Unpublish" : "Publish"}
                    >
                      {artwork.isPublic ? <EyeOff size={24} /> : <Globe size={24} />}
                    </button>
                    <button 
                      onClick={() => handleDeleteArtwork(artwork.id)}
                      className="w-14 h-14 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-all transform translate-y-8 group-hover:translate-y-0 shadow-xl"
                      title="Delete"
                    >
                      <Trash2 size={24} />
                    </button>
                  </div>
                  <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em] transform translate-y-4 group-hover:translate-y-0 transition-all delay-75">
                    {artwork.isPublic ? 'Edit / Unpublish / Delete' : 'Edit / Publish / Delete'}
                  </p>
                </div>
                <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity delay-150">
                   <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full border border-white/20">
                      <p className="text-[10px] text-white font-medium">{new Date(artwork.timestamp).toLocaleDateString()}</p>
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
