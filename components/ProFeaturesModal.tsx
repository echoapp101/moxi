import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Image as ImageIcon, Download, Sliders, ShieldCheck, Sparkles } from 'lucide-react';
import { subscriptionService } from '../services/subscriptionService';

interface ProFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProFeaturesModal: React.FC<ProFeaturesModalProps> = ({ isOpen, onClose }) => {
  const features = [
    {
      icon: <Download className="text-blue-500" size={20} />,
      title: "High-Res Exports",
      description: "Download your artwork at 2048x2048 resolution for professional printing."
    },
    {
      icon: <ShieldCheck className="text-emerald-500" size={20} />,
      title: "No Watermarks",
      description: "Remove the moxi.lol watermark from all your exported images."
    },
    {
      icon: <ImageIcon className="text-purple-500" size={20} />,
      title: "Custom Backgrounds",
      description: "Upload your own images to use as a canvas background."
    },
    {
      icon: <Sliders className="text-orange-500" size={20} />,
      title: "Advanced Physics",
      description: "Unlock the Physics tab to fine-tune drying speed, viscosity, and more."
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl overflow-hidden border border-zinc-100 dark:border-zinc-800"
          >
            {/* Header */}
            <div className="p-8 pb-0 flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black dark:bg-white flex items-center justify-center text-white dark:text-black">
                  <Sparkles size={24} fill="currentColor" />
                </div>
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">Get Pro</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 text-sm">Elevate your digital ink experience.</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Features List */}
            <div className="p-8 space-y-6">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-4 group">
                  <div className="w-10 h-10 rounded-xl bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-white">{feature.title}</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-8 pt-0">
              <button
                onClick={() => {
                  subscriptionService.createCheckoutSession();
                  onClose();
                }}
                className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl font-bold text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-xl shadow-black/10 active:scale-[0.98]"
              >
                <Zap size={18} fill="currentColor" />
                Upgrade to Pro
              </button>
              <p className="text-[10px] text-center text-zinc-400 mt-4 uppercase tracking-widest">
                Secure payment via Stripe • Cancel anytime
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
