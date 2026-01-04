import React, { useState, useEffect, useRef } from 'react';
import { Settings as SettingsIcon, Plus, History, Loader2, Sparkles, Layers, ChevronDown, Cloud, CloudDownload, CloudUpload, LogOut, RotateCcw, Volume2, VolumeX, Music } from 'lucide-react';
import { AppState, Marble, MARBLE_COLORS, MILESTONES, TonePreference, JarTheme, THEMES, CATEGORIES, MarbleSize } from './types';
import MarbleJar from './components/MarbleJar';
import EncouragementModal from './components/EncouragementModal';
import { generateEncouragement } from './services/geminiService';
import { supabase, loginWithMagicLink, saveToCloud, restoreFromCloud } from './services/syncService';

const STORAGE_KEY = 'marbleverse_state_v3';
const UNDO_KEY = 'marbleverse_undo_backup_v1';

// Audio Logic
const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const ambientOsc = useRef<OscillatorNode | null>(null);
  const ambientGain = useRef<GainNode | null>(null);

  const initCtx = () => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  };

  const playDrop = () => {
    initCtx();
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const now = ctx.currentTime;

    // Slight randomization for organic feel
    const pitchShift = (Math.random() - 0.5) * 200;
    const durationOffset = Math.random() * 0.05;

    // 1. The "Plink" (Glassy high-freq impact)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(3200 + pitchShift, now);
    osc1.frequency.exponentialRampToValueAtTime(1200 + pitchShift, now + 0.04);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // 2. The "Body" (Ceramic resonance)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(520 + pitchShift, now);
    osc2.frequency.exponentialRampToValueAtTime(440 + pitchShift, now + 0.2);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + durationOffset);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    // 3. Tiny noise burst for "Thud/Impact"
    const bufferSize = ctx.sampleRate * 0.02;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.02, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    noiseSource.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    noiseSource.start(now);
    
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.3);
  };

  const startAmbient = () => {
    initCtx();
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    if (ambientOsc.current) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(116.54, ctx.currentTime); // Bb2 - warm hum
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.02, ctx.currentTime + 2); // Very soft

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    ambientOsc.current = osc;
    ambientGain.current = gain;
  };

  const stopAmbient = () => {
    if (ambientGain.current && audioCtx.current) {
      const ctx = audioCtx.current;
      ambientGain.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
      setTimeout(() => {
        ambientOsc.current?.stop();
        ambientOsc.current = null;
        ambientGain.current = null;
      }, 1100);
    }
  };

  return { playDrop, startAmbient, stopAmbient };
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
    return {
      marbles: [],
      tone: 'Zen',
      theme: 'Classic',
      lastCheckIn: null,
      milestonesReached: [],
      soundEnabled: true,
      ambientEnabled: false
    };
  });

  const { playDrop, startAmbient, stopAmbient } = useAudio();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  
  const [undoSecondsRemaining, setUndoSecondsRemaining] = useState(0);
  const undoTimerRef = useRef<number | null>(null);

  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [reflection, setReflection] = useState('');
  const [isHonoringPast, setIsHonoringPast] = useState(false);
  const [honoringCount, setHonoringCount] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedColor, setSelectedColor] = useState(CATEGORIES[0].color);
  const [customLabel, setCustomLabel] = useState(CATEGORIES[0].label);
  const [selectedSize, setSelectedSize] = useState<MarbleSize>('lg');
  const [currentMilestoneMessage, setCurrentMilestoneMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    if (state.ambientEnabled) startAmbient();
    else stopAmbient();
  }, [state]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });
    return () => {
      subscription.unsubscribe();
      if (undoTimerRef.current) window.clearInterval(undoTimerRef.current);
      stopAmbient();
    };
  }, []);

  const handleMagicLink = async () => {
    if (!emailInput) return;
    setSyncLoading(true);
    try {
      const { error } = await loginWithMagicLink(emailInput);
      setSyncLoading(false);
      if (error) throw error;
      alert("Check your email for a login link!");
    } catch (err: any) {
      setSyncLoading(false);
      alert("Login error: " + err.message);
    }
  };

  const handleCloudSave = async () => {
    setSyncLoading(true);
    try {
      const { error } = await saveToCloud(state);
      setSyncLoading(false);
      if (error) throw error;
      alert("Jar saved to your cloud vault.");
    } catch (err: any) {
      setSyncLoading(false);
      alert("Save error: " + err.message);
    }
  };

  const handleCloudRestore = async () => {
    if (!window.confirm("Restore from cloud? This will replace all marbles currently on this phone.")) return;
    setSyncLoading(true);
    try {
      const { data, error } = await restoreFromCloud();
      setSyncLoading(false);
      if (error) throw error;
      if (!data || !data.marbles || data.marbles.length === 0) {
        if (!window.confirm("Your cloud vault appears to be empty. Overwrite your current jar with an empty one?")) return;
      }
      localStorage.setItem(UNDO_KEY, JSON.stringify(state));
      setState(data || { marbles: [], tone: 'Zen', theme: 'Classic', lastCheckIn: null, milestonesReached: [], soundEnabled: true, ambientEnabled: false });
      setShowSettings(false);
      setUndoSecondsRemaining(30);
      if (undoTimerRef.current) window.clearInterval(undoTimerRef.current);
      undoTimerRef.current = window.setInterval(() => {
        setUndoSecondsRemaining(prev => {
          if (prev <= 1) {
            if (undoTimerRef.current) window.clearInterval(undoTimerRef.current);
            localStorage.removeItem(UNDO_KEY);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setSyncLoading(false);
      alert("Could not restore: " + err.message);
    }
  };

  const handleUndoRestore = () => {
    const backup = localStorage.getItem(UNDO_KEY);
    if (backup) {
      setState(JSON.parse(backup));
      setUndoSecondsRemaining(0);
      if (undoTimerRef.current) window.clearInterval(undoTimerRef.current);
      localStorage.removeItem(UNDO_KEY);
    }
  };

  const addMarble = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    
    if (state.soundEnabled) playDrop();

    const count = isHonoringPast ? honoringCount : 1;
    const startCount = state.marbles.length;
    const newTotal = startCount + count;
    
    const milestone = MILESTONES.find(m => startCount < m && newTotal >= m);
    const isMilestoneDrop = !!milestone && !state.milestonesReached.includes(milestone);
    
    const newMarbles: Marble[] = [];
    for (let i = 0; i < count; i++) {
      const id = Date.now().toString(36) + Math.random().toString(36).substring(2) + i;
      const x = 10 + Math.random() * 75;
      const baseLayer = Math.floor((startCount + i) / 8);
      const y = Math.min(90, 5 + (baseLayer * 8) + (Math.random() * 5));
      
      newMarbles.push({
        id,
        timestamp: isHonoringPast ? Date.now() - (86400000 * (i + 1)) : Date.now(),
        note: i === 0 ? reflection.trim() : "",
        color: showAdvanced ? selectedColor : selectedCategory.color,
        position: { x, y },
        isHonoring: isHonoringPast,
        category: selectedCategory.id,
        label: customLabel,
        size: isMilestoneDrop && i === count - 1 ? 'xl' : selectedSize,
        isMilestone: isMilestoneDrop && i === count - 1
      });
    }

    const updatedMarbles = [...state.marbles, ...newMarbles];
    setState(prev => ({ ...prev, marbles: updatedMarbles, lastCheckIn: Date.now() }));
    setIsCheckInOpen(false);
    setReflection('');
    setIsHonoringPast(false);
    setHonoringCount(1);
    setIsProcessing(false);
    setShowAdvanced(false);
    setSelectedSize('lg');
    
    if (isMilestoneDrop) {
      try {
        const message = await generateEncouragement(newTotal, state.tone);
        setCurrentMilestoneMessage(message);
        setState(prev => ({ ...prev, milestonesReached: [...prev.milestonesReached, milestone] }));
      } catch (err) { console.error(err); }
    }
  };

  const currentTheme = THEMES[state.theme];

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto shadow-xl overflow-hidden relative transition-colors duration-700" style={{ backgroundColor: currentTheme.bg }}>
      <header className={`p-6 flex justify-between items-center bg-white/5 backdrop-blur-sm sticky top-0 z-30 ${currentTheme.text}`}>
        <div className="flex flex-col">
          <h1 className="text-2xl font-extrabold tracking-tight opacity-100 uppercase">Marbleverse</h1>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setShowHistory(true)} className="opacity-90 hover:opacity-100 transition-opacity p-2"><History size={18} /></button>
          <button onClick={() => setShowSettings(true)} className="opacity-90 hover:opacity-100 transition-opacity p-2"><SettingsIcon size={18} /></button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-32 relative">
        <div className={`text-center mb-4 ${currentTheme.text}`}>
          <p className="text-7xl font-extrabold serif opacity-100 transition-all duration-1000 tracking-tighter leading-none">{state.marbles.length}</p>
        </div>
        
        <MarbleJar marbles={state.marbles} theme={state.theme} />
        
        {undoSecondsRemaining > 0 && (
          <div className="absolute bottom-6 left-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-2 duration-700">
            <div className={`flex items-center justify-between px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-md transition-colors duration-500 ${
              state.theme === 'Midnight' ? 'bg-indigo-950/80 border-indigo-400/20 text-indigo-50' : 'bg-white/95 border-stone-200 text-stone-700'
            }`}>
              <div className="flex items-center gap-3">
                <RotateCcw size={14} className="opacity-100" />
                <span className="text-[11px] font-medium tracking-wide">Jar Restored ({undoSecondsRemaining}s)</span>
              </div>
              <button onClick={handleUndoRestore} className={`text-[10px] font-bold uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm ${state.theme === 'Midnight' ? 'bg-indigo-600 text-white' : 'bg-stone-800 text-white'}`}>Undo</button>
            </div>
          </div>
        )}
      </main>

      <button
        onClick={() => {
          setIsCheckInOpen(true);
        }}
        className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-90 z-40 ${
          state.theme === 'Midnight' ? 'bg-indigo-600/60 text-indigo-50 border border-indigo-400/40 shadow-indigo-500/20' : 'bg-white text-slate-700 border border-stone-100 shadow-stone-200/50'
        }`}
      >
        <Plus size={28} strokeWidth={2} />
      </button>

      {/* Add Marble Modal */}
      {isCheckInOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
          <div className="rounded-[3rem] p-8 w-full shadow-2xl animate-in fade-in zoom-in duration-300 max-w-sm border border-white/20 my-auto transition-colors duration-500" style={{ backgroundColor: currentTheme.bg }}>
            <h2 className={`text-xl font-bold serif mb-6 ${currentTheme.text}`}>A moment for you</h2>
            
            {/* Category Picker */}
            <div className="mb-6">
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-4 ${currentTheme.text} opacity-70`}>What's the win?</label>
              <div className="grid grid-cols-3 gap-3">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => { 
                      setSelectedCategory(cat); 
                      setSelectedColor(cat.color); 
                      setCustomLabel(cat.label);
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${selectedCategory.id === cat.id ? (state.theme === 'Midnight' ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-800 shadow-lg') : (state.theme === 'Midnight' ? 'bg-indigo-950/40 border-indigo-400/20' : 'bg-white border-slate-300')}`}
                  >
                    <div className="w-5 h-5 rounded-full shadow-inner" style={{ backgroundColor: cat.color, background: `radial-gradient(circle at 35% 35%, ${cat.color} 0%, rgba(0,0,0,0.3) 110%)` }} />
                    <span className={`text-[8px] font-bold uppercase tracking-tighter ${selectedCategory.id === cat.id ? 'text-white' : (state.theme === 'Midnight' ? 'text-indigo-300' : 'text-slate-800')}`}>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Label Input */}
            <div className="mb-6">
              <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${currentTheme.text} opacity-70`}>Label (optional)</label>
              <input 
                type="text" 
                maxLength={8}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value.toUpperCase())}
                placeholder="E.G. HAPPY"
                className={`w-full border rounded-xl px-4 py-3 text-sm font-bold tracking-widest focus:ring-2 transition-all outline-none ${state.theme === 'Midnight' ? 'bg-indigo-950/50 border-indigo-400/30 text-indigo-50 ring-indigo-500' : 'bg-white border-slate-300 text-slate-800 ring-slate-400'}`}
              />
            </div>

            {/* Honoring Past Toggle */}
            <div className={`mb-6 flex items-center justify-between p-4 rounded-2xl border ${state.theme === 'Midnight' ? 'bg-indigo-950/30 border-indigo-400/20' : 'bg-slate-100 border-slate-300'}`}>
              <span className={`text-[10px] font-black uppercase tracking-widest ${currentTheme.text}`}>Adding history?</span>
              <button 
                onClick={() => setIsHonoringPast(!isHonoringPast)}
                className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${isHonoringPast ? (state.theme === 'Midnight' ? 'bg-indigo-500' : 'bg-slate-800') : 'bg-slate-300'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${isHonoringPast ? 'translate-x-4' : ''}`} />
              </button>
            </div>

            {isHonoringPast && (
              <div className="mb-6 animate-in slide-in-from-top-2 duration-300">
                <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${currentTheme.text} opacity-70`}>How many?</label>
                <input 
                  type="range" min="1" max="20" 
                  value={honoringCount} 
                  onChange={(e) => setHonoringCount(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800 mb-2"
                />
                <div className={`text-center font-bold text-sm ${currentTheme.text}`}>{honoringCount} marbles</div>
              </div>
            )}

            <button onClick={() => setShowAdvanced(!showAdvanced)} className={`text-[9px] font-bold uppercase tracking-widest mb-6 block border-b border-transparent ${currentTheme.text} opacity-60 hover:opacity-100`}>
              {showAdvanced ? "Hide advanced" : "More options"}
            </button>

            {showAdvanced && (
              <div className="space-y-6 mb-8 animate-in slide-in-from-top-2 duration-300">
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${currentTheme.text} opacity-70`}>Custom color</label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {MARBLE_COLORS.map(color => (
                      <button key={color} onClick={() => setSelectedColor(color)} className={`w-6 h-6 shrink-0 rounded-full border-2 transition-all ${selectedColor === color ? 'border-slate-800 scale-110' : 'border-slate-300 opacity-100'}`} style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </div>
                <div>
                  <label className={`text-[10px] font-black uppercase tracking-widest block mb-3 ${currentTheme.text} opacity-70`}>Size</label>
                  <div className="flex gap-2">
                    {(['sm', 'md', 'lg'] as MarbleSize[]).map(s => (
                      <button key={s} onClick={() => setSelectedSize(s)} className={`px-4 py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all ${selectedSize === s ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-800 border-slate-300'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <textarea className={`w-full h-20 p-4 border-b rounded-none focus:ring-0 transition-all bg-transparent placeholder:text-slate-500 resize-none mb-8 text-sm leading-relaxed ${currentTheme.text} ${state.theme === 'Midnight' ? 'border-indigo-400/30 focus:border-indigo-400' : 'border-slate-300 focus:border-slate-500'}`} placeholder="Write a tiny note..." value={reflection} onChange={(e) => setReflection(e.target.value)} />
            
            <div className="flex gap-4">
              <button onClick={() => { setIsCheckInOpen(false); setReflection(''); setShowAdvanced(false); setCustomLabel(selectedCategory.label); setIsHonoringPast(false); setHonoringCount(1); }} className={`flex-1 py-4 text-xs font-bold uppercase tracking-widest active:opacity-50 transition-opacity ${currentTheme.text} opacity-80`}>Close</button>
              <button onClick={addMarble} disabled={isProcessing} className={`flex-[2] py-4 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 flex items-center justify-center transition-all ${state.theme === 'Midnight' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 hover:bg-slate-900'}`}>{isProcessing ? <Loader2 className="animate-spin" size={18} /> : 'Drop it in'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 animate-in fade-in duration-300 overflow-y-auto transition-colors duration-500" style={{ backgroundColor: currentTheme.bg }}>
          <div className="w-full h-full flex flex-col max-w-md">
            <div className="flex justify-between items-center mb-12">
              <h2 className={`text-3xl font-bold serif ${currentTheme.text}`}>Settings</h2>
              <button onClick={() => setShowSettings(false)} className={`p-3 rounded-full transition-colors ${state.theme === 'Midnight' ? 'bg-indigo-900 text-indigo-300' : 'bg-slate-200 text-slate-600'}`}><Plus size={24} className="rotate-45" /></button>
            </div>
            <div className="space-y-12 pb-12">
              
              {/* Audio Settings */}
              <div className={`p-8 rounded-[2.5rem] border shadow-sm ${state.theme === 'Midnight' ? 'bg-indigo-950/30 border-indigo-400/20' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <Volume2 size={18} className={currentTheme.text} />
                  <h3 className={`font-bold uppercase text-[10px] tracking-widest ${currentTheme.text}`}>Sounds & Delight</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${currentTheme.text}`}>Drop chime</span>
                    <button 
                      onClick={() => setState({...state, soundEnabled: !state.soundEnabled})}
                      className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${state.soundEnabled ? (state.theme === 'Midnight' ? 'bg-indigo-500' : 'bg-slate-800') : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${state.soundEnabled ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-medium ${currentTheme.text}`}>Warm ambient hum</span>
                    <button 
                      onClick={() => setState({...state, ambientEnabled: !state.ambientEnabled})}
                      className={`w-10 h-6 rounded-full p-1 transition-colors duration-300 ${state.ambientEnabled ? (state.theme === 'Midnight' ? 'bg-indigo-500' : 'bg-slate-800') : 'bg-slate-300'}`}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full transition-transform duration-300 ${state.ambientEnabled ? 'translate-x-4' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Cloud Sync */}
              <div className={`p-8 rounded-[2.5rem] border shadow-sm ${state.theme === 'Midnight' ? 'bg-indigo-950/30 border-indigo-400/20' : 'bg-white border-slate-200'}`}>
                <div className="flex items-center gap-3 mb-6">
                  <Cloud size={18} className={state.theme === 'Midnight' ? 'text-indigo-400' : 'text-slate-700'} />
                  <h3 className={`font-bold uppercase text-[10px] tracking-widest ${currentTheme.text}`}>Cloud Vault</h3>
                </div>
                {!userEmail ? (
                  <div className="space-y-4">
                    <p className={`text-[11px] leading-relaxed font-medium ${currentTheme.text}`}>Keep your jar safe in the cloud.</p>
                    <div className="flex gap-2">
                      <input type="email" placeholder="email..." className={`flex-1 border rounded-xl px-4 py-3 text-sm focus:ring-2 transition-all outline-none ${state.theme === 'Midnight' ? 'bg-indigo-950/50 border-indigo-400/30 text-indigo-50 ring-indigo-500' : 'bg-slate-50 border-slate-300 text-slate-800 ring-indigo-200'}`} value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
                      <button onClick={handleMagicLink} disabled={syncLoading} className={`px-5 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest disabled:opacity-50 active:scale-95 transition-all text-white ${state.theme === 'Midnight' ? 'bg-indigo-600' : 'bg-slate-800'}`}>{syncLoading ? <Loader2 className="animate-spin" size={14} /> : "Link"}</button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-medium ${currentTheme.text}`}>{userEmail}</span>
                      <button onClick={() => supabase.auth.signOut()} className={`text-[10px] font-bold uppercase tracking-widest hover:opacity-70 ${state.theme === 'Midnight' ? 'text-rose-400' : 'text-rose-600'}`}>Out</button>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={handleCloudSave} disabled={syncLoading} className={`flex flex-col items-center gap-2 py-5 rounded-2xl border transition-all active:scale-95 group ${state.theme === 'Midnight' ? 'bg-indigo-900/40 border-indigo-400/20' : 'bg-indigo-50/50 border-indigo-100'}`}><CloudUpload className="text-indigo-600" size={20} /><span className={`text-[9px] font-bold uppercase ${state.theme === 'Midnight' ? 'text-indigo-300' : 'text-indigo-800'}`}>Save</span></button>
                      <button onClick={handleCloudRestore} disabled={syncLoading} className={`flex flex-col items-center gap-2 py-5 rounded-2xl border transition-all active:scale-95 group ${state.theme === 'Midnight' ? 'bg-stone-900/40 border-stone-700/30' : 'bg-stone-50 border-stone-300'}`}><CloudDownload className="text-stone-800" size={20} /><span className={`text-[9px] font-bold uppercase ${currentTheme.text}`}>Load</span></button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className={`text-[10px] uppercase tracking-widest font-extrabold block mb-5 ${currentTheme.text}`}>Atmosphere</label>
                <div className="grid grid-cols-3 gap-4">{(['Classic', 'Midnight', 'Ceramic'] as JarTheme[]).map(t => (<button key={t} onClick={() => setState({...state, theme: t})} className={`py-5 rounded-2xl text-[10px] font-black transition-all border-2 ${state.theme === t ? (state.theme === 'Midnight' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105') : (state.theme === 'Midnight' ? 'bg-indigo-950/40 text-indigo-300 border-indigo-400/20' : 'bg-white border-slate-300 hover:border-slate-500')}`}>{t}</button>))}</div>
              </div>
              <div>
                <label className={`text-[10px] uppercase tracking-widest font-extrabold block mb-5 ${currentTheme.text}`}>Voice</label>
                <div className="grid grid-cols-3 gap-4">{(['Zen', 'Poetic', 'Grounded'] as TonePreference[]).map(t => (<button key={t} onClick={() => setState({...state, tone: t})} className={`py-5 rounded-2xl text-[10px] font-black transition-all border-2 ${state.tone === t ? (state.theme === 'Midnight' ? 'bg-indigo-600 text-white border-indigo-400' : 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105') : (state.theme === 'Midnight' ? 'bg-indigo-950/40 text-indigo-300 border-indigo-400/20' : 'bg-white border-slate-300 hover:border-slate-500')}`}>{t}</button>))}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentMilestoneMessage && <EncouragementModal count={state.marbles.length} message={currentMilestoneMessage} onClose={() => setCurrentMilestoneMessage(null)} themeBg={currentTheme.bg} themeText={currentTheme.text} isDark={state.theme === 'Midnight'} />}
      
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 transition-colors duration-500" style={{ backgroundColor: currentTheme.bg }}>
          <div className="w-full h-full flex flex-col max-w-md">
            <div className={`flex justify-between items-center mb-8 shrink-0 ${currentTheme.text}`}>
              <h2 className="text-3xl font-bold serif">What's in here</h2>
              <button onClick={() => setShowHistory(false)} className={`p-3 opacity-100 active:scale-90 transition-transform ${state.theme === 'Midnight' ? 'text-indigo-300' : 'text-slate-800'}`}><Plus size={28} className="rotate-45" /></button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-5 pb-24 scrollbar-hide">
              {[...state.marbles].reverse().map((marble) => (
                <div key={marble.id} className={`p-7 rounded-[2.5rem] border shadow-sm backdrop-blur-md ${state.theme === 'Midnight' ? 'bg-indigo-900/30 border-indigo-400/20' : 'bg-white/90 border-stone-200'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${currentTheme.text}`}>{new Date(marble.timestamp).toLocaleDateString()}</span>
                    {marble.category && <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest border ${state.theme === 'Midnight' ? 'bg-indigo-800/50 text-indigo-100 border-indigo-400/30' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>{marble.category}</span>}
                  </div>
                  <p className={`italic leading-relaxed font-semibold ${currentTheme.text}`}>{marble.note || "A little win."}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;