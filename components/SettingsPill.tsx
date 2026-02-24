/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { Sliders, Paintbrush, Droplets, Trash2, Eye, RefreshCw, Palette } from 'lucide-react';
import { AIOperationState } from '../types';

interface SettingsPillProps {
  onClick: () => void;
  isHidden: boolean;
  aiOperation: AIOperationState | null;
  className?: string;
}

const getIcon = (iconName?: string) => {
  switch(iconName) {
      case 'brush': return <Paintbrush size={18} />;
      case 'water': return <Droplets size={18} />;
      case 'settings': return <Sliders size={18} />;
      case 'trash': return <Trash2 size={18} />;
      case 'eye': return <Eye size={18} />;
      case 'refresh': return <RefreshCw size={18} />;
      case 'physics': return <Sliders size={18} />;
      case 'palette': return <Palette size={18} />;
      default: return <Sliders size={18} />;
  }
};

const AnimatedSliderDisplay = ({ value, min, max }: { value: number, min: number, max: number }) => {
    const [width, setWidth] = useState(0);
    const [displayValue, setDisplayValue] = useState(min);

    useEffect(() => {
        const targetWidth = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
        const timer = setTimeout(() => setWidth(targetWidth), 50);

        let startTimestamp: number | null = null;
        const duration = 800;
        const startValue = min; 
        
        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            
            const current = startValue + (value - startValue) * easeOut;
            setDisplayValue(current);
            
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        const animFrame = window.requestAnimationFrame(step);

        return () => {
            clearTimeout(timer);
            window.cancelAnimationFrame(animFrame);
        };
    }, [value, min, max]);

    return (
        <div className="flex items-center gap-2 w-full h-4">
            <div className="relative flex-1 h-1 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div 
                    className="absolute top-0 left-0 h-full bg-black dark:bg-white transition-all duration-700 ease-out"
                    style={{ width: `${width}%` }}
                ></div>
            </div>
            <span className="text-[9px] font-mono text-zinc-500 w-6 text-right">
                {Math.round(displayValue)}
            </span>
        </div>
    );
};

export const SettingsPill: React.FC<SettingsPillProps> = ({ onClick, isHidden, aiOperation, className = '' }) => {
  return (
    <button
      onClick={onClick}
      className={`absolute z-40 bg-white dark:bg-zinc-900 shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-zinc-100 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-full flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95
        ${className}
        ${isHidden ? 'opacity-0 translate-y-12 pointer-events-none' : 'opacity-100 translate-y-0 pointer-events-auto'} 
        ${aiOperation ? 'w-[300px] px-5 h-14' : 'w-[160px] px-8 h-14 hover:scale-105'}`}
    >
      {/* Normal State: Settings Label */}
      <div className={`absolute flex items-center gap-3 transition-opacity duration-300 ${aiOperation ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
           <Sliders size={18} />
           <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Settings</span>
      </div>

      {/* AI Active State: Dynamic Content */}
      {aiOperation && (
          <div 
              key={`${aiOperation.label}-${aiOperation.value}`}
              className="w-full flex items-center gap-4 animate-in fade-in zoom-in-95 duration-300"
          >
              <div className="text-black dark:text-white bg-zinc-100 dark:bg-zinc-800 p-2 rounded-full flex-shrink-0">
                  {getIcon(aiOperation.icon)}
              </div>
              
              <div className="flex-1 flex flex-col justify-center gap-0.5 min-w-0">
                  <span className={`text-[9px] uppercase font-bold text-zinc-400 tracking-widest leading-none ${aiOperation.type === 'action' ? 'text-[10px] text-black dark:text-white' : ''}`}>
                      {aiOperation.label}
                  </span>
                  
                  {aiOperation.type === 'slider' && typeof aiOperation.value === 'number' && (
                      <AnimatedSliderDisplay 
                          value={aiOperation.value} 
                          min={aiOperation.min || 0} 
                          max={aiOperation.max || 100} 
                      />
                  )}

                  {aiOperation.type === 'color' && typeof aiOperation.value === 'string' && (
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
                           <div 
                              className="h-full w-full transition-colors duration-500" 
                              style={{ backgroundColor: aiOperation.value }}
                           ></div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </button>
  );
};
