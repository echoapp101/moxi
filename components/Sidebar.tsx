import React, { useState, useEffect } from 'react';
import { User as UserIcon, Settings, Globe, LogOut, LogIn, ChevronRight, ChevronLeft, Library, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { subscriptionService } from '../services/subscriptionService';
import { signInWithGoogle, logout, subscribeToAuthChanges } from '../services/firebase';
import { User } from 'firebase/auth';

interface SidebarProps {
  onOpenLibrary: () => void;
  onOpenGallery: () => void;
  onOpenSettings: () => void;
  onOpenAuth: () => void;
  onOpenProFeatures: () => void;
  proActive: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenLibrary, onOpenGallery, onOpenSettings, onOpenAuth, onOpenProFeatures, proActive }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    if (user) {
      await logout();
    } else {
      onOpenAuth();
    }
  };

  return (
    <motion.div 
      initial={false}
      animate={{ width: isExpanded ? 240 : 80 }}
      className="fixed left-0 top-0 h-full bg-white dark:bg-zinc-900 border-r border-zinc-100 dark:border-zinc-800 z-[70] flex flex-col shadow-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
    >
      {/* Toggle Button */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -right-3 top-12 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white shadow-sm z-10"
      >
        {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Logo / Top section */}
      <div className="p-6 flex items-center gap-4 overflow-hidden">
        <div className="w-8 h-8 bg-black dark:bg-white rounded-xl flex-shrink-0 flex items-center justify-center text-white dark:text-black font-bold text-lg">
          M
        </div>
        <AnimatePresence>
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="font-bold tracking-tighter text-xl whitespace-nowrap dark:text-white"
            >
              Moxi
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-8 space-y-2">
        <SidebarItem 
          icon={<Library size={20} />} 
          label="My Library" 
          isExpanded={isExpanded} 
          onClick={() => user ? onOpenLibrary() : onOpenAuth()}
        />
        <SidebarItem 
          icon={<Globe size={20} />} 
          label="Gallery" 
          isExpanded={isExpanded} 
          onClick={() => user ? onOpenGallery() : onOpenAuth()}
        />
        <SidebarItem 
          icon={<Settings size={20} />} 
          label="Settings" 
          isExpanded={isExpanded} 
          onClick={() => user ? onOpenSettings() : onOpenAuth()}
        />
        {!proActive && user && (
          <SidebarItem 
            icon={<Zap size={20} className="text-amber-500" />} 
            label="Get Pro" 
            isExpanded={isExpanded} 
            onClick={onOpenProFeatures}
          />
        )}
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-zinc-100 dark:border-zinc-800">
        <div 
          className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${user ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'} cursor-pointer overflow-hidden`}
          onClick={user ? undefined : handleAuth}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full flex-shrink-0 border border-zinc-200 dark:border-zinc-700" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 flex-shrink-0">
              <UserIcon size={18} />
            </div>
          )}
          
          <AnimatePresence>
            {isExpanded && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex-1 min-w-0"
              >
                <p className="text-xs font-bold truncate text-zinc-900 dark:text-white">
                  {user ? user.displayName : 'Sign In'}
                </p>
                <p className="text-[10px] text-zinc-400 truncate">
                  {user ? user.email : 'Google Account'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {user && isExpanded && (
          <button 
            onClick={handleAuth}
            className="w-full mt-2 flex items-center gap-3 p-3 rounded-2xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs font-bold uppercase tracking-widest"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        )}
      </div>
    </motion.div>
  );
};

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  isExpanded: boolean;
  onClick: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, isExpanded, onClick }) => {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-2xl text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:text-black dark:hover:text-white transition-all group overflow-hidden"
    >
      <div className="flex-shrink-0 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.span 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="text-xs font-bold uppercase tracking-widest whitespace-nowrap"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};
