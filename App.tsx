/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { InkSimulation } from './services/inkSimulation';
import { ControlPanel } from './components/ControlPanel';
import { SettingsPill } from './components/SettingsPill';
import { Gallery } from './components/Gallery';
import { Library } from './components/Library';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { SettingsModal } from './components/SettingsModal';
import { galleryService, Artwork } from './services/galleryService';
import { auth, subscribeToAuthChanges } from './services/firebase';
import { User } from 'firebase/auth';
import { subscriptionService } from './services/subscriptionService';
import { AnimatePresence, motion } from 'motion/react';
import { BrushType, PaperType, SimulationParams, PaperParams, AIOperationState, RecordedAction, RecordingState, Snapshot } from './types';
import { DEFAULT_SETTINGS } from './defaultConfig';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const backgroundCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simRef = useRef<InkSimulation | null>(null);
  const animationRef = useRef<number | null>(null);
  const isMouseDown = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  // -- Timing for Fixed Timestep --
  const simulationTimingRef = useRef({ lastTime: 0, accumulator: 0 });
  
  // -- State --
  const [params, setParams] = useState<SimulationParams>(DEFAULT_SETTINGS.simulation);
  const [isSettingsMinimized, setIsSettingsMinimized] = useState(false);

  const [paperParams, setPaperParams] = useState<PaperParams>(DEFAULT_SETTINGS.paper);

  // Keep track of parameters for stable callbacks and AI sync
  const paramsRef = useRef(params);
  useEffect(() => { paramsRef.current = params; }, [params]);

  const paperParamsRef = useRef(paperParams);
  useEffect(() => { paperParamsRef.current = paperParams; }, [paperParams]);

  const [viewMode, setViewMode] = useState<'ink' | 'fibers'>('ink');
  const viewModeRef = useRef(viewMode);
  useEffect(() => { viewModeRef.current = viewMode; }, [viewMode]);

  const [activeTab, setActiveTab] = useState<'paint' | 'brushes' | 'physics' | 'paper' | 'studio'>('paint');

  const handleTabClick = (tab: 'paint' | 'brushes' | 'physics' | 'paper' | 'studio') => {
    if (tab === 'physics' && !proActive) {
      subscriptionService.createCheckoutSession();
      return;
    }
    setActiveTab(tab);
  };
  const [view, setView] = useState<'studio' | 'gallery' | 'library'>('studio');
  const [showAuth, setShowAuth] = useState(false);
  const guestDrawingTimeRef = useRef<number>(0);
  const currentStrokeStartRef = useRef<number | null>(null);
  const [guestLimitReached, setGuestLimitReached] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [proActive, setProActive] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    darkMode: false,
    highFidelity: true
  });

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (u) => {
      setUser(u);
      if (u) {
        subscriptionService.verifySubscription().then(result => setProActive(result.proActive));
        // Ensure profile exists and has basic data
        try {
          const profile = await galleryService.getProfile(u.uid);
          // If it's a default/empty profile (no bio and default name), initialize it
          if (!profile.bio && profile.displayName === 'Anonymous Artist') {
            await galleryService.updateProfile(u.uid, {
              displayName: u.displayName || 'Anonymous Artist',
              photoURL: u.photoURL,
              uid: u.uid
            });
          }
        } catch (err) {
          console.error("Profile sync failed", err);
        }
      } else {
        // Redirect to studio on logout
        setView('studio');
      }
    });
    
    // Load settings
    const savedSettings = localStorage.getItem('moxi_settings') || localStorage.getItem('ink_studio_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsed }));
        
        setPaperParams(prev => ({
          ...prev,
          resolution: parsed.highFidelity ? 1024 : 512
        }));

        if (parsed.darkMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      } catch (e) {}
    }

    return () => unsubscribe();
  }, []);

  const handleSettingsChange = (newSettings: any) => {
    setSettings(newSettings);
    localStorage.setItem('moxi_settings', JSON.stringify(newSettings));
    
    setPaperParams(prev => ({
      ...prev,
      resolution: newSettings.highFidelity ? 1024 : 512
    }));

    if (newSettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // -- AI Operation Visualization Queue --
  const [aiOpQueue, setAiOpQueue] = useState<AIOperationState[]>([]);
  const [currentAiOp, setCurrentAiOp] = useState<AIOperationState | null>(null);

  // -- Recording State --
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const recordedActionsRef = useRef<RecordedAction[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const playbackRef = useRef<{ startTime: number; index: number; requestId: number } | null>(null);

  // -- Undo/Redo State --
  const undoStack = useRef<Snapshot[]>([]);
  const redoStack = useRef<Snapshot[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0);

  const saveSnapshot = useCallback(() => {
    if (!simRef.current) return;
    
    // Deep clone parameters
    const snapshot: Snapshot = {
      arrays: simRef.current.getSnapshotArrays(),
      params: JSON.parse(JSON.stringify(paramsRef.current)),
      paperParams: JSON.parse(JSON.stringify(paperParamsRef.current))
    };

    undoStack.current.push(snapshot);
    if (undoStack.current.length > 10) {
      undoStack.current.shift();
    }
    redoStack.current = [];
    setHistoryVersion(v => v + 1);
  }, []);

  const handleUndo = useCallback(() => {
    if (!simRef.current || undoStack.current.length === 0) return;

    const currentSnapshot: Snapshot = {
        arrays: simRef.current.getSnapshotArrays(),
        params: JSON.parse(JSON.stringify(paramsRef.current)),
        paperParams: JSON.parse(JSON.stringify(paperParamsRef.current))
    };
    redoStack.current.push(currentSnapshot);

    const prevSnapshot = undoStack.current.pop();
    if (prevSnapshot) {
        simRef.current.restoreSnapshotArrays(prevSnapshot.arrays);
        setParams(prevSnapshot.params);
        setPaperParams(prevSnapshot.paperParams);
    }
    setHistoryVersion(v => v + 1);
    triggerAiOp({ type: 'action', label: 'Undo', icon: 'settings' });
  }, []);

  const handleRedo = useCallback(() => {
    if (!simRef.current || redoStack.current.length === 0) return;

    const currentSnapshot: Snapshot = {
        arrays: simRef.current.getSnapshotArrays(),
        params: JSON.parse(JSON.stringify(paramsRef.current)),
        paperParams: JSON.parse(JSON.stringify(paperParamsRef.current))
    };
    undoStack.current.push(currentSnapshot);

    const nextSnapshot = redoStack.current.pop();
    if (nextSnapshot) {
        simRef.current.restoreSnapshotArrays(nextSnapshot.arrays);
        setParams(nextSnapshot.params);
        setPaperParams(nextSnapshot.paperParams);
    }
    setHistoryVersion(v => v + 1);
    triggerAiOp({ type: 'action', label: 'Redo', icon: 'settings' });
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
            if (e.shiftKey) {
                handleRedo();
            } else {
                handleUndo();
            }
            e.preventDefault();
        } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
            handleRedo();
            e.preventDefault();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);


  const recordAction = useCallback((type: RecordedAction['type'], data?: any) => {
    if (recordingState === 'recording') {
        recordedActionsRef.current.push({
            timestamp: Date.now() - recordingStartTimeRef.current,
            type,
            data
        });
    }
  }, [recordingState]);

  const triggerAiOp = useCallback((op: AIOperationState) => {
    setAiOpQueue(prev => [...prev, op]);
  }, []);

  useEffect(() => {
    if (aiOpQueue.length > 0) {
        if (!currentAiOp || currentAiOp.autoClear === false) {
             const nextOp = aiOpQueue[0];
             setCurrentAiOp(nextOp);
             setAiOpQueue(prev => prev.slice(1));
        }
    }
  }, [currentAiOp, aiOpQueue]);

  useEffect(() => {
    if (currentAiOp) {
        if (currentAiOp.autoClear === false) return; 
        const duration = 2000; 
        const tm = setTimeout(() => {
            setCurrentAiOp(null);
        }, duration);
        return () => clearTimeout(tm);
    }
  }, [currentAiOp]);

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
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
  };

  const handleUpdateParams = useCallback((updates: Partial<SimulationParams>) => {
    setParams(prev => ({ ...prev, ...updates }));
    recordAction('param_change', updates);
  }, [recordAction]);

  const handleUpdatePaper = useCallback((updates: Partial<PaperParams>) => {
    setPaperParams(prev => ({ ...prev, ...updates }));
    recordAction('paper_change', updates);
  }, [recordAction]);

  const handleRegenPaper = useCallback(() => {
    saveSnapshot(); 
    if (simRef.current) {
        const p = paperParamsRef.current;
        simRef.current.generatePaper(p.type, p.roughness, p.contrast, p.align);
    }
    recordAction('regen_paper');
  }, [recordAction, saveSnapshot]);

  const handleClear = useCallback(() => {
      saveSnapshot(); 
      simRef.current?.clear();
      recordAction('clear');
  }, [recordAction, saveSnapshot]);

  const handleNewCanvas = useCallback((noConfirm: boolean = false) => {
    if (noConfirm || window.confirm('Start a new canvas? This will clear your current work.')) {
        simRef.current?.clear();
        undoStack.current = [];
        redoStack.current = [];
        saveSnapshot();
        return true;
    }
    return false;
  }, [saveSnapshot]);

  const handleToggleView = useCallback(() => {
      setViewMode(m => m === 'ink' ? 'fibers' : 'ink');
      recordAction('toggle_view');
  }, [recordAction]);

  const handleCopyConfig = useCallback(() => {
      const config = {
          simulation: paramsRef.current,
          paper: paperParamsRef.current
      };
      const fileContent = `import { BrushType, PaperType, SimulationParams, PaperParams } from './types';

export const DEFAULT_SETTINGS: { simulation: SimulationParams, paper: PaperParams } = ${JSON.stringify(config, null, 2)};`;

      navigator.clipboard.writeText(fileContent)
          .then(() => alert("Default configuration file copied to clipboard! Paste this into defaultConfig.ts"))
          .catch(err => console.error("Failed to copy settings", err));
  }, []);
  
    const handleSaveImage = useCallback((highRes: boolean) => {
    if (highRes && !proActive) {
      subscriptionService.createCheckoutSession();
      return;
    }
    if (!canvasRef.current) return;

    const mainCanvas = canvasRef.current;
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    const resolution = highRes ? 2048 : 1024;
    tempCanvas.width = resolution;
    tempCanvas.height = resolution;

    // Draw the original canvas content
    tempCtx.drawImage(mainCanvas, 0, 0, resolution, resolution);

    // Add watermark if not pro
    if (!proActive) {
      tempCtx.font = 'bold 24px sans-serif';
      tempCtx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      tempCtx.textAlign = 'right';
      tempCtx.textBaseline = 'bottom';
      tempCtx.fillText('Moxi', resolution - 20, resolution - 20);
    }

    const link = document.createElement('a');
    link.download = `moxi-ink-${Date.now()}${highRes ? '-high-res' : ''}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }, [proActive]);

  useEffect(() => {
    if (backgroundImage && backgroundCanvasRef.current) {
      const canvas = backgroundCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const img = new Image();
        img.onload = () => {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        };
        img.src = backgroundImage;
      }
    }
  }, [backgroundImage]);

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!proActive) {
      subscriptionService.createCheckoutSession();
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setBackgroundImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditArtwork = useCallback(async (artwork: Artwork) => {
    if (!simRef.current) return;
    
    setLoading(true);
    setView('paint');
    
    // Create an image element to load the data URL
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (!simRef.current) return;
      
      // Clear simulation first
      simRef.current.clear();
      
      // Create a temporary canvas to get image data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = paperParams.resolution;
      tempCanvas.height = paperParams.resolution;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(img, 0, 0, paperParams.resolution, paperParams.resolution);
        const imgData = tempCtx.getImageData(0, 0, paperParams.resolution, paperParams.resolution);
        
        // Load into simulation
        simRef.current.drawSketch(imgData.data, paperParams.resolution, paperParams.resolution);
      }
      
      setLoading(false);
      saveSnapshot();
    };
    img.src = artwork.imageData;
  }, [paperParams.resolution, saveSnapshot]);

  const handlePublish = useCallback(async () => {
      if (!canvasRef.current || !user) return;
      const imageData = canvasRef.current.toDataURL('image/png');
      const userInfo = {
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      };
      try {
          await galleryService.publishArtwork(imageData, userInfo, true);
          setView('gallery');
      } catch (err) {
          console.error("Failed to publish", err);
          alert("Failed to publish artwork");
      }
  }, [user]);

  const handleSaveToLibrary = useCallback(async () => {
      if (!canvasRef.current || !user) return;
      const imageData = canvasRef.current.toDataURL('image/png');
      const userInfo = {
        displayName: user.displayName,
        photoURL: user.photoURL,
        uid: user.uid
      };
      try {
          await galleryService.publishArtwork(imageData, userInfo, false);
          setView('library');
      } catch (err) {
          console.error("Failed to save", err);
          alert("Failed to save artwork");
      }
  }, [user]);

  useEffect(() => {
    // AI Tool Handler removed
  }, [handleClear, handleRegenPaper, handleToggleView, handleUpdateParams, handleUpdatePaper, triggerAiOp, handleUndo, handleRedo, saveSnapshot]); 

  useEffect(() => {
    setLoading(true);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const initSim = () => {
      const res = paperParams.resolution;
      simRef.current = new InkSimulation(res, res);
      const p = paperParams;
      simRef.current.generatePaper(p.type, p.roughness, p.contrast, p.align);
      setLoading(false);
      undoStack.current = [];
      redoStack.current = [];
      setHistoryVersion(0);
    };

    const tm = setTimeout(initSim, 100);
    return () => clearTimeout(tm);
  }, [paperParams.resolution]);

  useEffect(() => {
    if(!loading && simRef.current) {
        const p = paperParams;
        simRef.current.generatePaper(p.type, p.roughness, p.contrast, p.align);
    }
  }, [paperParams.type, paperParams.roughness, paperParams.contrast, paperParams.align, loading]);

  useEffect(() => {
    if (!simRef.current || loading) return;

    const currentRes = paperParams.resolution;
    
    const bufferCanvas = document.createElement('canvas');
    bufferCanvas.width = currentRes;
    bufferCanvas.height = currentRes;
    const bufferCtx = bufferCanvas.getContext('2d');
    const imgData = bufferCtx!.createImageData(currentRes, currentRes);
    const u32Buffer = new Uint32Array(imgData.data.buffer);
    
    simulationTimingRef.current.lastTime = 0;
    simulationTimingRef.current.accumulator = 0;

    let isFirstRender = true;

    const render = () => {
      const sim = simRef.current;
      if (!sim) return;
      
      const p = paramsRef.current; 
      
      const now = performance.now();
      if (simulationTimingRef.current.lastTime === 0) simulationTimingRef.current.lastTime = now;
      const frameTime = now - simulationTimingRef.current.lastTime;
      simulationTimingRef.current.lastTime = now;
      
      simulationTimingRef.current.accumulator += Math.min(frameTime, 200);
      
      const tps = currentRes <= 256 ? 60 : currentRes <= 512 ? 30 : 15;
      const FIXED_TIMESTEP = 1000 / tps; 

      sim.setParams(p.dryingSpeed, p.viscosity, p.paperResist, p.inkWeight);
      sim.brushType = p.brushType;

      let steps = 0;
      const MAX_STEPS = 10; 
      while (simulationTimingRef.current.accumulator >= FIXED_TIMESTEP && steps < MAX_STEPS) {
          sim.step();
          simulationTimingRef.current.accumulator -= FIXED_TIMESTEP;
          steps++;
      }

      // Optimization: Only re-render pixels if simulation stepped, user is drawing, or first frame
      if (steps > 0 || isMouseDown.current || isFirstRender) {
        isFirstRender = false;
        const { w, h, fibers, rho, cFixed, mFixed, yFixed, cFloating, mFloating, yFloating } = sim;
        const len = w * h;

        const isFiberView = viewModeRef.current === 'fibers';

        for (let i = 0; i < len; i++) {
          const fib = fibers[i];
          
          if (isFiberView) { 
            const v = (fib * 255) | 0;
            u32Buffer[i] = (255 << 24) | (v << 16) | (v << 8) | v;
            continue;
          }

          const C = cFixed[i] + cFloating[i];
          const M = mFixed[i] + mFloating[i];
          const Y = yFixed[i] + yFloating[i];

          if (C < 0.005 && M < 0.005 && Y < 0.005) {
              const paperVal = (255 - fib * 15) | 0;
              u32Buffer[i] = (255 << 24) | ((paperVal - 5) << 16) | (paperVal << 8) | paperVal;
              continue;
          }

          const paperVal = (255 - fib * 15) | 0;
          
          let val = 1.0 - C * 1.2;
          const fC = val < 0 ? 0 : val;
          val = 1.0 - M * 1.2;
          const fM = val < 0 ? 0 : val;
          val = 1.0 - Y * 1.2;
          const fY = val < 0 ? 0 : val;

          let r = (paperVal * fC) | 0;
          let g = (paperVal * fM) | 0;
          let b = ((paperVal - 5) * fY) | 0; 

          if (rho[i] > 1.05) {
            r = (r * 0.98) | 0;
            g = (g * 0.98) | 0;
            b = (b * 0.98) | 0;
          }
          
          u32Buffer[i] = (255 << 24) | (b << 16) | (g << 8) | r;
        }

        bufferCtx!.putImageData(imgData, 0, 0);
      }
      
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.imageSmoothingEnabled = false;
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.drawImage(bufferCanvas, 0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }

      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [loading, paperParams.resolution, view, showSettings]);

  const getSimPos = (e: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current || !simRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    
    const simW = simRef.current.w;
    const simH = simRef.current.h;

    return {
      x: (clientX - rect.left) * (simW / rect.width),
      y: (clientY - rect.top) * (simH / rect.height)
    };
  };

  const applyInput = (x: number, y: number, vx: number, vy: number) => {
    if (!simRef.current) return;
    const p = paramsRef.current; 
    const rgb = hsvToRgb(p.color.h, p.color.s, p.color.b);
    
    const resScale = simRef.current.w / 256;
    
    simRef.current.addInput(
      x, y, 
      p.brushSize * resScale, 
      p.waterAmount / 50, 
      p.inkAmount / 20, 
      rgb.r, rgb.g, rgb.b, 
      vx, vy
    );

    recordAction('input', { x, y, vx, vy });
  };

  const startStroke = (e: React.MouseEvent | React.TouchEvent) => {
    if (recordingState === 'playing') return;

    if (!user) {
      if (guestDrawingTimeRef.current >= 15000) {
        setGuestLimitReached(true);
        setShowAuth(true);
        return;
      }
      currentStrokeStartRef.current = Date.now();
    }

    saveSnapshot();

    isMouseDown.current = true;
    const pos = getSimPos(e);
    lastPos.current = pos;
    applyInput(pos.x, pos.y, 0, 0);
  };

  const moveStroke = (e: React.MouseEvent | React.TouchEvent) => {
    if (recordingState === 'playing') return;
    if (!isMouseDown.current || !lastPos.current) return;
    
    if (!user && currentStrokeStartRef.current) {
      const currentStrokeDuration = Date.now() - currentStrokeStartRef.current;
      if (guestDrawingTimeRef.current + currentStrokeDuration >= 15000) {
        guestDrawingTimeRef.current = 15000;
        currentStrokeStartRef.current = null;
        endStroke();
        setGuestLimitReached(true);
        setShowAuth(true);
        return;
      }
    }

    const pos = getSimPos(e);
    const dx = pos.x - lastPos.current.x;
    const dy = pos.y - lastPos.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    const dragVX = Math.max(-2, Math.min(2, dx));
    const dragVY = Math.max(-2, Math.min(2, dy));

    const resScale = (simRef.current?.w || 256) / 256;
    const p = paramsRef.current;
    const stepSize = Math.max(0.5, (p.brushSize * resScale) * 0.25);
    const steps = Math.ceil(dist / stepSize);

    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      applyInput(
        lastPos.current.x + dx * t,
        lastPos.current.y + dy * t,
        dragVX,
        dragVY
      );
    }
    lastPos.current = pos;
  };

  const endStroke = () => {
    if (isMouseDown.current) {
        saveSnapshot();
    }
    if (!user && currentStrokeStartRef.current) {
      guestDrawingTimeRef.current += Date.now() - currentStrokeStartRef.current;
      currentStrokeStartRef.current = null;
    }
    isMouseDown.current = false;
    lastPos.current = null;
  };

  const startRecording = () => {
    recordedActionsRef.current = [];
    recordingStartTimeRef.current = Date.now();
    setRecordingState('recording');
    
    recordedActionsRef.current.push({
        timestamp: 0,
        type: 'param_change',
        data: JSON.parse(JSON.stringify(paramsRef.current))
    });
    recordedActionsRef.current.push({
        timestamp: 0,
        type: 'paper_change',
        data: JSON.parse(JSON.stringify(paperParamsRef.current))
    });
  };

  const stopRecording = () => {
    setRecordingState('idle');
  };

  const playRecording = () => {
    if (recordedActionsRef.current.length === 0) return;
    if (playbackRef.current) cancelAnimationFrame(playbackRef.current.requestId);

    setRecordingState('playing');
    simRef.current?.clear();

    const startTime = Date.now();
    playbackRef.current = { startTime, index: 0, requestId: 0 };

    const playbackLoop = () => {
        if (!playbackRef.current) return;
        
        const now = Date.now();
        const elapsed = now - playbackRef.current.startTime;
        const actions = recordedActionsRef.current;
        let index = playbackRef.current.index;

        while (index < actions.length && actions[index].timestamp <= elapsed) {
            const action = actions[index];
            switch(action.type) {
                case 'input':
                    if (simRef.current) {
                        const p = paramsRef.current;
                        const rgb = hsvToRgb(p.color.h, p.color.s, p.color.b);
                        const resScale = simRef.current.w / 256;
                        simRef.current.addInput(
                            action.data.x, action.data.y, 
                            p.brushSize * resScale, 
                            p.waterAmount / 50, 
                            p.inkAmount / 20, 
                            rgb.r, rgb.g, rgb.b, 
                            action.data.vx, action.data.vy
                        );
                    }
                    break;
                case 'param_change':
                    setParams(prev => ({ ...prev, ...action.data }));
                    break;
                case 'paper_change':
                    setPaperParams(prev => ({ ...prev, ...action.data }));
                    break;
                case 'clear':
                    simRef.current?.clear();
                    break;
                case 'regen_paper':
                    if (simRef.current) {
                        const p = paperParamsRef.current; 
                        simRef.current.generatePaper(p.type, p.roughness, p.contrast, p.align);
                    }
                    break;
                case 'toggle_view':
                    setViewMode(m => m === 'ink' ? 'fibers' : 'ink');
                    break;
            }
            index++;
        }

        playbackRef.current.index = index;

        if (index < actions.length) {
            playbackRef.current.requestId = requestAnimationFrame(playbackLoop);
        } else {
            setRecordingState('idle');
            playbackRef.current = null;
        }
    };

    playbackRef.current.requestId = requestAnimationFrame(playbackLoop);
  };

  const saveRecording = () => {
    const blob = new Blob([JSON.stringify(recordedActionsRef.current)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moxi-session-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadRecording = (data: any) => {
    if (Array.isArray(data)) {
        recordedActionsRef.current = data;
        alert(`Loaded ${data.length} actions. Press Play to start.`);
    }
  };

  const toggleLive = () => {
    // AI Voice removed
  };

  const displayScale = 1024 / paperParams.resolution;

  return (
    <div 
        ref={containerRef}
        className="w-full h-screen bg-[var(--bg)] relative overflow-hidden select-none touch-none flex flex-col items-center justify-center font-sans transition-colors duration-500"
    >
        {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50 backdrop-blur-xl">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-2 border-zinc-200 border-t-black rounded-full animate-spin"></div>
                    <div className="text-[10px] font-bold tracking-[0.3em] text-zinc-400 uppercase">
                        Initializing Matrix {paperParams.resolution}
                    </div>
                </div>
            </div>
        )}
        
        <Sidebar 
            onOpenLibrary={() => setView('library')}
            onOpenGallery={() => setView('gallery')}
            onOpenSettings={() => setShowSettings(true)}
            onOpenAuth={() => setShowAuth(true)}
            proActive={proActive}
        />

        <AnimatePresence mode="wait">
            {view === 'studio' ? (
                <motion.div 
                    key="studio"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center justify-center gap-12 w-full h-full p-8 transition-all duration-500 pl-32"
                >
                    {/* Canvas Column */}
                    <div className="flex flex-col items-center">
                        {/* Canvas Wrapper */}
                        <div className="relative shadow-[0_30px_60px_rgba(0,0,0,0.12)] bg-white cursor-crosshair touch-none flex items-center justify-center max-w-[90vw] max-h-[80vh] aspect-square rounded-3xl overflow-hidden border border-white">
                            {!loading && (
                                <>
              <canvas
                ref={backgroundCanvasRef}
                className="absolute inset-0 w-full h-full"
                width={paperParams.resolution}
                height={paperParams.resolution}
              />
              <canvas
                ref={canvasRef}
                width={paperParams.resolution * displayScale}
                height={paperParams.resolution * displayScale}
                className="relative z-10 w-full h-full touch-none"
                onMouseDown={startStroke}
                onMouseMove={moveStroke}
                onMouseUp={endStroke}
                onMouseLeave={endStroke}
                onTouchStart={startStroke}
                onTouchMove={moveStroke}
                onTouchEnd={endStroke}
              />
            </>
                            )}
                            
                            {/* Settings Toggle Pill */}
                            <SettingsPill 
                                onClick={() => setIsSettingsMinimized(false)}
                                isHidden={!isSettingsMinimized}
                                aiOperation={currentAiOp}
                                className="fixed right-6 top-1/2 -translate-y-1/2"
                            />
                        </div>
                    </div>

                    {/* ControlPanel */}
                    <ControlPanel
                        params={params}
                        paperParams={paperParams}
                        updateParams={handleUpdateParams}
                        updatePaper={handleUpdatePaper}
                        onClear={handleClear}
                        onRegenPaper={handleRegenPaper}
                        onToggleView={handleToggleView}
                        viewMode={viewMode}
                        activeTab={activeTab}
                        setActiveTab={handleTabClick}
                        aiOperation={currentAiOp}
                        recordingState={recordingState}
                        onStartRecording={startRecording}
                        onStopRecording={stopRecording}
                        onPlayRecording={playRecording}
                        onLoadRecording={loadRecording}
                        onSaveRecording={saveRecording}
                        onCopyConfig={handleCopyConfig}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        canUndo={undoStack.current.length > 0}
                        canRedo={redoStack.current.length > 0}
                        isMinimized={isSettingsMinimized}
                        setIsMinimized={setIsSettingsMinimized}
                        onSaveImage={handleSaveImage}
                        onBackgroundImageUpload={handleBackgroundImageUpload}
                        proActive={proActive}
                        onPublish={handlePublish}
                        onSave={handleSaveToLibrary}
                    />
                </motion.div>
            ) : view === 'gallery' ? (
                <motion.div 
                    key="gallery"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full pl-32"
                >
                    <Gallery onClose={() => setView('studio')} />
                </motion.div>
            ) : (
                <motion.div 
                    key="library"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                    className="w-full h-full pl-32"
                >
                    <Library 
                        onNewCanvas={() => {
                            if (handleNewCanvas(true)) {
                                setView('studio');
                            }
                        }} 
                        onEditArtwork={handleEditArtwork}
                    />
                </motion.div>
            )}
        </AnimatePresence>

        <AnimatePresence>
            {showAuth && (
              <AuthModal 
                onClose={() => {
                  setShowAuth(false);
                  setGuestLimitReached(false);
                }} 
                onSuccess={() => {
                  setGuestLimitReached(false);
                }}
                message={guestLimitReached ? "Log in or sign up to continue" : undefined}
              />
            )}
            {showSettings && (
                <SettingsModal 
                    onClose={() => setShowSettings(false)} 
                    settings={settings}
                    onSettingsChange={handleSettingsChange} 
                />
            )}
        </AnimatePresence>
    </div>
  );
};

export default App;