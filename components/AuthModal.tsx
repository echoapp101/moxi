import React, { useState } from 'react';
import { X, Mail, Lock, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '../services/firebase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
  message?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, message }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmail(email, password);
      } else {
        if (!username.trim()) {
          throw new Error('Username is required');
        }
        await signUpWithEmail(email, password, username);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

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
        <div className="p-8 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-900">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {message || (isLogin ? 'Welcome Back' : 'Join Moxi')}
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400 mt-1">
              {isLogin ? 'Sign in to continue drawing' : 'Create an account to save your work'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="w-12 h-12 rounded-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white transition-all hover:bg-zinc-100 dark:hover:bg-zinc-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl text-red-600 dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white"
                  required={!isLogin}
                />
              </div>
            )}
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
              <input 
                type="password"
                placeholder="Password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-4 focus:ring-black/5 dark:focus:ring-white/5 transition-all dark:text-white"
                required
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xl shadow-black/10 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-100 dark:border-zinc-800"></div>
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold text-zinc-400 bg-white dark:bg-zinc-900 px-4">
              Or continue with
            </div>
          </div>

          <button 
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
            Google
          </button>

          <p className="text-center text-xs text-zinc-500">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setIsLogin(!isLogin)}
              className="text-black dark:text-white font-bold hover:underline"
            >
              {isLogin ? 'Sign Up' : 'Sign In'}
            </button>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};
