/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useRef, useState } from 'react';
import { Sliders, Paintbrush, FileText, Droplets, Trash2, Eye, RefreshCw, Monitor, ChevronDown, Palette, Film, Play, Square, Circle, Download, Upload, Copy, Bug, Undo2, Redo2, Image as ImageIcon, Globe, Share2, Save } from 'lucide-react';
import { SimulationParams, PaperParams, BrushType, PaperType, AIOperationState, RecordingState } from '../types';
import { ENABLE_STUDIO_TAB } from '../defaultConfig';

// Helper: HSV to RGB Object
const hsvToRgb = (h: number, s: number, v: number) => {
  s /= 100; v /= 100;
  let c = v * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = v - c;
  let r = 0, g = 0, b = 0;
  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }
  return { 
      r: Math.round((r + m) * 255), 
      g: Math.round((g + m) * 255), 
      b: Math.round((b + m) * 255) 
  };
};

// Helper: HSV to RGB String
const hsvToRgbString = (h: number, s: number, v: number) => {
    const { r, g, b } = hsvToRgb(h, s, v);
    return `rgb(${r}, ${g}, ${b})`;
};

// Extracted Components
interface RangeProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  gradient?: string;
}

const Range: React.FC<RangeProps> = ({ label, value, min, max, step, onChange, gradient }) => (
  <div className="flex flex-col gap-1 w-full">
    <div className="flex justify-between">
      <label className="text-[10px] uppercase font-bold text-zinc-500 dark:text-zinc-400">{label}</label>
      <span className="text-[10px] text-zinc-400 dark:text-zinc-500">{value.toFixed(1)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 touch-none slider-thumb-fix ${gradient ? '' : 'bg-zinc-200 dark:bg-zinc-700'}`}
      style={gradient ? { background: gradient } : {}}
    />
  </div>
);

interface TabButtonProps {
  id: 'paint' | 'brushes' | 'physics' | 'paper' | 'studio';
  activeTab: 'paint' | 'brushes' | 'physics' | 'paper' | 'studio';
  setActiveTab: (tab: 'paint' | 'brushes' | 'physics' | 'paper' | 'studio') => void;
  icon: any;
  label: string;
}

const TabButton: React.FC<TabButtonProps> = ({ id, activeTab, setActiveTab, icon: Icon, label }) => (
  <button
    onClick={() => setActiveTab(id)}
    className={`flex-1 flex flex-col items-center justify-center py-4 text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 ${
      activeTab === id 
        ? 'text-black dark:text-white bg-white dark:bg-zinc-800 shadow-[0_-2px_0_inset_#000] dark:shadow-[0_-2px_0_inset_#fff]' 
        : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
    }`}
  >
    <Icon size={18} className="mb-1.5" />
    {label}
  </button>
);

interface ControlPanelProps {
  params: SimulationParams;
  paperParams: PaperParams;
  updateParams: (updates: Partial<SimulationParams>) => void;
  updatePaper: (updates: Partial<PaperParams>) => void;
  onClear: () => void;
  onRegenPaper: () => void;
  onToggleView: () => void;
  viewMode: 'ink' | 'fibers';
  activeTab: 'paint' | 'brushes' | 'physics' | 'paper' | 'studio';
  setActiveTab: (tab: 'paint' | 'brushes' | 'physics' | 'paper' | 'studio') => void;
  aiOperation: AIOperationState | null;
  recordingState: RecordingState;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onPlayRecording: () => void;
  onLoadRecording: (data: any) => void;
  onSaveRecording: () => void;
  onCopyConfig: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  isMinimized: boolean;
  setIsMinimized: (val: boolean) => void;
  onSaveImage: (highRes: boolean) => void;
  proActive: boolean;
  onPublish: () => void;
  onSave: () => void;
  onBackgroundImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  paperParams,
  updateParams,
  updatePaper,
  onClear,
  onRegenPaper,
  onToggleView,
  viewMode,
  activeTab,
  setActiveTab,
  aiOperation,
  recordingState,
  onStartRecording,
  onStopRecording,
  onPlayRecording,
  onLoadRecording,
  onSaveRecording,
  onCopyConfig,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isMinimized,
  setIsMinimized,
  onSaveImage,
  proActive,
  onPublish,
  onSave,
  onBackgroundImageUpload
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showTerms, setShowTerms] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const json = JSON.parse(ev.target?.result as string);
          onLoadRecording(json);
        } catch (err) {
          console.error("Failed to load recording", err);
          alert("Invalid file format");
        }
      };
      reader.readAsText(file);
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <>
      <style>{`
        .slider-thumb-fix::-webkit-slider-thumb {
          -webkit-appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #d1d5db;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          margin-top: -1px; /* Centered visually */
        }
        .slider-thumb-fix::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid #d1d5db;
          box-shadow: 0 1px 2px rgba(0,0,0,0.1);
          border: none;
        }
      `}</style>

      {/* Main Panel */}
      <div 
          className={`fixed w-[calc(100%-2rem)] max-w-[420px] bg-white dark:bg-zinc-900 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-zinc-100 dark:border-zinc-800 overflow-hidden flex flex-col z-40 transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) safe-area-bottom touch-auto
            bottom-6 left-1/2 transform -translate-x-1/2
            lg:static lg:w-[420px] lg:transform-none lg:mx-0 lg:left-auto lg:right-auto lg:top-auto lg:bottom-auto
            ${isMinimized 
                ? 'translate-y-[120%] opacity-0 pointer-events-none lg:hidden' 
                : 'translate-y-0 opacity-100 lg:block'
            }`}
      >
        {/* Tabs */}
        <div className="relative flex border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-800/30 pr-12">
          <TabButton id="paint" activeTab={activeTab} setActiveTab={setActiveTab} icon={Paintbrush} label="Paint" />
          <TabButton id="brushes" activeTab={activeTab} setActiveTab={setActiveTab} icon={Droplets} label="Brushes" />
          <TabButton id="physics" activeTab={activeTab} setActiveTab={setActiveTab} icon={Sliders} label="Physics" />
          <TabButton id="paper" activeTab={activeTab} setActiveTab={setActiveTab} icon={FileText} label="Paper" />
          {ENABLE_STUDIO_TAB && (
            <TabButton id="studio" activeTab={activeTab} setActiveTab={setActiveTab} icon={Film} label="Studio" />
          )}
          
          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(true)}
            className="absolute top-0 right-0 h-full w-12 flex items-center justify-center text-zinc-400 hover:text-black dark:hover:text-white hover:bg-zinc-100/50 dark:hover:bg-zinc-700/50 transition-colors border-l border-zinc-100 dark:border-zinc-800"
            aria-label="Minimize Settings"
          >
            <ChevronDown size={20} />
          </button>
        </div>

        {/* Content Area */}
        <div className="p-6 min-h-[220px] flex flex-col justify-between">
          {activeTab === 'paint' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <Range label="Size" value={params.brushSize} min={1} max={40} step={0.1} onChange={(v: number) => updateParams({ brushSize: v })} />
                <Range label="Water" value={params.waterAmount} min={0} max={100} step={1} onChange={(v: number) => updateParams({ waterAmount: v })} />
                <Range label="Ink" value={params.inkAmount} min={0} max={100} step={1} onChange={(v: number) => updateParams({ inkAmount: v })} />
              </div>
              <div className="h-px bg-zinc-100 dark:bg-zinc-800 w-full" />
              <div className="space-y-4">
                {/* Hue Slider */}
                <Range 
                  label="Hue" value={params.color.h} min={0} max={360} step={1} 
                  onChange={(v: number) => updateParams({ color: { ...params.color, h: v } })}
                  gradient="linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)"
                />
                <div className="flex gap-4">
                  {/* Saturation Slider */}
                  <Range 
                    label="Saturation" value={params.color.s} min={0} max={100} step={1} 
                    onChange={(v: number) => updateParams({ color: { ...params.color, s: v } })}
                    gradient={`linear-gradient(to right, ${hsvToRgbString(params.color.h, 0, params.color.b)}, ${hsvToRgbString(params.color.h, 100, params.color.b)})`}
                  />
                  {/* Brightness Slider */}
                  <Range 
                    label="Brightness" value={params.color.b} min={0} max={100} step={1} 
                    onChange={(v: number) => updateParams({ color: { ...params.color, b: v } })}
                    gradient={`linear-gradient(to right, #000000, ${hsvToRgbString(params.color.h, params.color.s, 100)})`}
                  />
                </div>
              </div>
              <div className="flex justify-between items-center mt-2">
                  <div className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Active Pigment</div>
                  <div className="w-10 h-10 rounded-2xl shadow-inner border-2 border-white dark:border-zinc-700 ring-1 ring-zinc-200 dark:ring-zinc-700" style={{ backgroundColor: hsvToRgbString(params.color.h, params.color.s, params.color.b) }}></div>
              </div>
            </div>
          )}

          {activeTab === 'brushes' && (
            <div className="grid grid-cols-5 gap-3">
              {[
                { id: BrushType.ROUND, label: 'Round', style: 'w-6 h-6 rounded-full bg-zinc-800 dark:bg-zinc-200' },
                { id: BrushType.FLAT, label: 'Flat', style: 'w-5 h-1.5 bg-zinc-800 dark:bg-zinc-200 rotate-[-45deg] rounded-sm' },
                { id: BrushType.SUMI, label: 'Sumi', style: 'w-3 h-3 rounded-full border border-zinc-800/30 dark:border-zinc-200/30 bg-zinc-800/10 dark:bg-zinc-200/10' },
                { id: BrushType.SPRAY, label: 'Spray', style: 'w-5 h-5 rounded-full border-2 border-dashed border-zinc-400 dark:border-zinc-500' },
                { id: BrushType.WATER, label: 'Water', style: 'w-4 h-4 rounded-full border-2 border-blue-400 rotate-[-45deg] rounded-br-none' },
              ].map((brush) => (
                <button
                  key={brush.id}
                  onClick={() => updateParams({ brushType: brush.id })}
                  className={`flex-col items-center justify-center p-3 rounded-2xl border transition-all flex ${
                    params.brushType === brush.id 
                      ? 'border-black dark:border-white bg-zinc-50 dark:bg-zinc-800 text-black dark:text-white shadow-sm' 
                      : 'border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-400'
                  }`}
                >
                  <div className="h-10 w-10 flex items-center justify-center mb-1.5">
                    <div className={brush.style}></div>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-tighter">{brush.label}</span>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'physics' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-x-6 gap-y-8">
                <Range label="Drying Speed" value={params.dryingSpeed} min={0} max={100} step={1} onChange={(v: number) => updateParams({ dryingSpeed: v })} />
                <Range label="Viscosity" value={params.viscosity} min={0} max={100} step={1} onChange={(v: number) => updateParams({ viscosity: v })} />
                <Range label="Paper Resist" value={params.paperResist} min={0} max={100} step={1} onChange={(v: number) => updateParams({ paperResist: v })} />
                <Range label="Pigment Weight" value={params.inkWeight} min={0} max={100} step={1} onChange={(v: number) => updateParams({ inkWeight: v })} />
              </div>
            </div>
          )}

          {activeTab === 'paper' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest">Surface Texture</label>
                  <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-xl">
                      {Object.values(PaperType).map((type) => (
                          <button
                              key={type}
                              onClick={() => { updatePaper({ type }); setTimeout(onRegenPaper, 10); }}
                              className={`flex-1 py-2 text-[10px] uppercase font-bold rounded-lg transition-all ${
                                  paperParams.type === type ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                              }`}
                          >
                              {type}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="flex flex-col gap-2">
                  <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-widest flex items-center gap-1">
                      <Monitor size={10} /> Grid Density
                  </label>
                  <div className="flex bg-zinc-100/50 dark:bg-zinc-800/50 p-1 rounded-xl">
                      {[256, 512, 1024].map((res) => (
                          <button
                              key={res}
                              onClick={() => updatePaper({ resolution: res as any })}
                              className={`flex-1 py-2 text-[10px] uppercase font-bold rounded-lg transition-all ${
                                  paperParams.resolution === res 
                                      ? 'bg-white dark:bg-zinc-700 text-black dark:text-white shadow-sm' 
                                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                              }`}
                          >
                              {res === 256 ? '256' : res === 512 ? '512' : '1024'}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <Range label="Roughness" value={paperParams.roughness} min={1} max={100} step={1} onChange={(v: number) => updatePaper({ roughness: v })} />
                <Range label="Contrast" value={paperParams.contrast} min={0} max={100} step={1} onChange={(v: number) => updatePaper({ contrast: v })} />
              </div>
              
              <button 
                  onClick={onRegenPaper}
                  className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-black/10"
              >
                  <RefreshCw size={14} /> Reset Surface
              </button>
              <input type="file" id="background-upload" className="hidden" onChange={onBackgroundImageUpload} accept="image/*" />
              <label htmlFor="background-upload" className="w-full bg-black dark:bg-white text-white dark:text-black py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors shadow-lg shadow-black/10 cursor-pointer">
                <ImageIcon size={14} /> Upload Background
              </label>
            </div>
          )}

          {activeTab === 'studio' && ENABLE_STUDIO_TAB && (
            <div className="flex flex-col gap-6 h-full justify-center">
              <div className="text-center">
                <div className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-1 ${
                  recordingState === 'recording' ? 'text-red-500 animate-pulse' : 
                  recordingState === 'playing' ? 'text-emerald-500' : 'text-zinc-300'
                }`}>
                  {recordingState === 'recording' ? 'Recording Session' : 
                   recordingState === 'playing' ? 'Replaying Session' : 'Studio Ready'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {recordingState === 'recording' ? (
                  <button 
                    onClick={onStopRecording}
                    className="flex flex-col items-center justify-center p-6 rounded-3xl border-2 border-red-50 bg-red-50/50 text-red-600 hover:bg-red-50 transition-all gap-2"
                  >
                    <Square size={24} fill="currentColor" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Stop</span>
                  </button>
                ) : (
                  <button 
                    onClick={onStartRecording}
                    disabled={recordingState !== 'idle'}
                    className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all gap-2 ${
                       recordingState === 'idle' 
                       ? 'border-zinc-100 text-zinc-800 hover:bg-zinc-50' 
                       : 'border-zinc-50 text-zinc-200 cursor-not-allowed'
                    }`}
                  >
                    <Circle size={24} fill="currentColor" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Record</span>
                  </button>
                )}

                <button 
                  onClick={onPlayRecording}
                  disabled={recordingState !== 'idle'}
                  className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all gap-2 ${
                    recordingState === 'idle'
                    ? 'border-zinc-100 text-zinc-800 hover:bg-zinc-50'
                    : 'border-zinc-50 text-zinc-200 cursor-not-allowed'
                  }`}
                >
                  <Play size={24} fill={recordingState === 'idle' ? "currentColor" : "none"} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Play</span>
                </button>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={onSaveRecording}
                  disabled={recordingState !== 'idle'}
                  className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border border-zinc-100 text-zinc-600 hover:bg-zinc-50 hover:text-black transition-all disabled:opacity-30"
                >
                  <Download size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Export</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={recordingState !== 'idle'}
                  className="flex-1 flex items-center justify-center gap-2 p-4 rounded-2xl border border-zinc-100 text-zinc-600 hover:bg-zinc-50 hover:text-black transition-all disabled:opacity-30"
                >
                  <Upload size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Import</span>
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".json" 
                  onChange={handleFileChange}
                />
              </div>
            </div>
          )}

          {/* Global Footer Actions */}
          {activeTab !== 'studio' && (
            <div className="mt-6 pt-6 pb-10 border-t border-zinc-100 dark:border-zinc-800 flex flex-col gap-6">
                <div className="flex gap-2">
                    <div className="flex gap-1">
                       <button
                            onClick={onUndo}
                            disabled={!canUndo}
                            className={`w-12 h-12 border rounded-xl flex items-center justify-center transition-all ${
                                canUndo ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-black dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-200 dark:text-zinc-700'
                            }`}
                            title="Undo (Ctrl+Z)"
                       >
                            <Undo2 size={18} />
                       </button>
                       <button
                            onClick={onRedo}
                            disabled={!canRedo}
                            className={`w-12 h-12 border rounded-xl flex items-center justify-center transition-all ${
                                canRedo ? 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-black dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700' : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 text-zinc-200 dark:text-zinc-700'
                            }`}
                            title="Redo (Ctrl+Y)"
                       >
                            <Redo2 size={18} />
                       </button>
                    </div>

                    <div className="flex-1 flex gap-2">
                        <button 
                            onClick={onClear}
                            className="flex-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-100 transition-all"
                        >
                            <Trash2 size={14} /> Clear
                        </button>
                    </div>
                </div>

                <button 
                    onClick={() => onSaveImage(false)}
                    className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                >
                    <Download size={18} /> Download
                </button>
                {proActive && (
                  <button 
                      onClick={() => onSaveImage(true)}
                      className="w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                  >
                      <Download size={18} /> Download High-Res
                  </button>
                )}

                <div className="flex gap-3">
                    <button 
                        onClick={onPublish}
                        className="flex-1 bg-black dark:bg-white text-white dark:text-black py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all shadow-xl shadow-black/10 active:scale-[0.98]"
                    >
                        <Share2 size={18} /> Publish
                    </button>
                    <button 
                        onClick={onSave}
                        className="flex-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all active:scale-[0.98]"
                    >
                        <Save size={18} /> Save
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
