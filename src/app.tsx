import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// ============ SUPABASE ============
const supabase = createClient(
  'https://zlcuuweuzcgaisykuomy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsY3V1d2V1emNnYWlzeWt1b215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NzA3ODUsImV4cCI6MjA4MzE0Njc4NX0.9bt8AuP89Tm2-lwqxy-0inNjzN7Mhg254qanFG9--ho'
);

type TonePreference = 'Zen' | 'Poetic' | 'Grounded';
type JarTheme = 'Classic' | 'Midnight' | 'Ceramic';
type MarbleSize = 'sm' | 'md' | 'lg' | 'xl';

interface Marble {
  id: string;
  timestamp: number;
  note?: string;
  color: string;
  position: { x: number; y: number };
  isHonoring?: boolean;
  category?: string;
  label?: string;
  size?: MarbleSize;
  isMilestone?: boolean;
}

interface MilestoneDate {
  id: string;
  name: string;
  date: string;
}

interface AppState {
  marbles: Marble[];
  tone: TonePreference;
  theme: JarTheme;
  lastCheckIn: number | null;
  milestonesReached: number[];
  soundEnabled: boolean;
  milestoneDates: MilestoneDate[];
}

const DEFAULT_STATE: AppState = {
  marbles: [],
  tone: 'Zen',
  theme: 'Classic',
  lastCheckIn: null,
  milestonesReached: [],
  soundEnabled: true,
  milestoneDates: []
};

const STORAGE_KEY = 'marbleverse_state_v4';
const MILESTONES = [7, 13, 30, 60, 90, 100, 365];

const MARBLE_COLORS = ['#4ECDC4', '#FF8C42', '#FFD700', '#4361EE', '#F72585', '#70E000', '#9B5DE5', '#00BBF9'];

const CATEGORIES = [
  { id: 'sober', name: 'Sobriety', label: 'SOBER', color: '#4361EE' },
  { id: 'water', name: 'Hydration', label: 'WATER', color: '#4ECDC4' },
  { id: 'move', name: 'Movement', label: 'MOVE', color: '#70E000' },
  { id: 'rest', name: 'Rest', label: 'REST', color: '#9B5DE5' },
  { id: 'general', name: 'General', label: '', color: '#FFD700' },
];

const THEMES: Record<JarTheme, { bg: string; jarBorder: string; jarBg: string; text: string; textSoft: string; accent: string }> = {
  Classic: { bg: '#ffffff', jarBorder: 'rgba(180,200,195,0.5)', jarBg: 'rgba(227,243,241,0.25)', text: '#5a7a74', textSoft: '#7a9a94', accent: '#4ECDC4' },
  Midnight: { bg: '#0a0a0c', jarBorder: 'rgba(129,140,248,0.3)', jarBg: 'rgba(49,46,129,0.15)', text: '#e0e7ff', textSoft: '#a5b4fc', accent: '#818cf8' },
  Ceramic: { bg: '#fffbf7', jarBorder: 'rgba(180,160,140,0.4)', jarBg: 'rgba(245,235,224,0.35)', text: '#8b7355', textSoft: '#a89070', accent: '#d4a574' }
};

const ENCOURAGEMENTS: Record<TonePreference, Record<number, string[]>> = {
  Zen: {
    7: ["Seven days. You showed up seven times. That's a whole week of trying.", "Look at you, collecting moments like seashells. Seven so far.", "A week of small yeses. The jar notices."],
    13: ["Thirteen! The universe's favorite weirdo number. You fit right in.", "A baker's dozen of grace. One extra, just because.", "13 marbles. Some people think that's unlucky. Those people are wrong."],
    30: ["Thirty whole days of not giving up. That's a moon cycle of stubborn hope.", "A month! You just proved you can do hard things for 30 days straight.", "30 marbles sitting pretty. You built that."],
    60: ["Sixty days. Two whole months of choosing yourself.", "Look at this jar getting crowded. 60 marbles need a bigger house.", "Two months of showing up. Day-one-you would be proud."],
    90: ["90 DAYS. A whole season. You've weathered something beautiful.", "A quarter year of tiny wins. That's not tiny anymore.", "90 marbles. Somewhere, a chicken is clucking in your honor."],
    100: ["TRIPLE DIGITS. You absolute legend.", "One hundred. You did that. Nobody else. Just you.", "100 moments of not quitting. Frame this."],
    365: ["A YEAR. 365 days of gathering yourself back together.", "One whole trip around the sun, collecting grace.", "365 marbles. Proof you can do hard things."]
  },
  Poetic: {
    7: ["Seven small stones, stacking toward something bigger.", "A week of breadcrumbs leading you home to yourself.", "Seven stars in your pocket. The constellation begins."],
    13: ["Thirteen — the number of misfits and miracles. You're both.", "A sideways dozen plus grace. The math works.", "Thirteen whispers of 'I think I can.'"],
    30: ["A moon has waxed and waned while you gathered these.", "One month of stitching yourself back together.", "Thirty sunrises you didn't waste."],
    60: ["Sixty pearls on a string of ordinary days made extraordinary.", "Two moons of quiet revolution.", "Sixty chapters in the language of showing up."],
    90: ["A season. You've weathered a whole season of becoming.", "Ninety threads woven into something like hope.", "The jar grows heavy with gathered grace."],
    100: ["A hundred small rebellions against giving up.", "Triple digits of defiant, stubborn, beautiful trying.", "One hundred love letters to your future self."],
    365: ["A year held in glass. Every hard day counts.", "365 acts of faith that tomorrow could be different.", "The jar overflows with a year of not quitting."]
  },
  Grounded: {
    7: ["Seven days. You showed up. That's the assignment.", "A week in the jar. Not bad.", "7 down. More where that came from."],
    13: ["13 marbles. Luck had nothing to do with it.", "Thirteen. Building something real here.", "A baker's dozen of 'I did that.'"],
    30: ["A month. Not a fluke — a pattern. A good one.", "30 days of doing the thing. You're the thing-doer now.", "One month of receipts that you can handle your life."],
    60: ["Two months. Not a phase. This is who you're becoming.", "60 marbles don't lie. You're doing this.", "Halfway to 90."],
    90: ["90 days. You've made a habit of not giving up.", "Three months of proof.", "90 marbles. Weight. Substance. You."],
    100: ["Triple digits. The hundred club. Membership: stubbornness.", "100. A HUNDRED. Say it out loud.", "Welcome to 100. The only requirement was not quitting."],
    365: ["365 days. One whole year of choosing yourself.", "A year becoming someone who doesn't quit.", "365 marbles. Days you thought you couldn't but did."]
  }
};

const getEncouragement = (count: number, tone: TonePreference): string => {
  const milestone = MILESTONES.find(m => m === count);
  if (!milestone) return count + " marbles. Look at you go.";
  const msgs = ENCOURAGEMENTS[tone][milestone];
  return msgs[Math.floor(Math.random() * msgs.length)];
};

const SIZE_MAP: Record<MarbleSize, number> = { sm: 22, md: 30, lg: 44, xl: 58 };

const getDaysSince = (dateString: string): number => {
  const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);
  const initCtx = () => { if (!audioCtx.current) audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)(); };
  const playDrop = () => {
    initCtx();
    if (!audioCtx.current) return;
    const ctx = audioCtx.current;
    const now = ctx.currentTime;
    const pitchShift = (Math.random() - 0.5) * 200;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(3200 + pitchShift, now);
    osc1.frequency.exponentialRampToValueAtTime(1200 + pitchShift, now + 0.04);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(520 + pitchShift, now);
    osc2.frequency.exponentialRampToValueAtTime(440 + pitchShift, now + 0.2);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc1.start(now); osc2.start(now); osc1.stop(now + 0.2); osc2.stop(now + 0.3);
  };
  return { playDrop };
};

const MarbleJar: React.FC<{ marbles: Marble[]; theme: JarTheme }> = ({ marbles, theme }) => {
  const t = THEMES[theme];
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: '320px', aspectRatio: '3 / 4.5', margin: '2rem auto 0' }}>
      <div style={{ position: 'absolute', inset: 0, border: '3px solid ' + t.jarBorder, borderRadius: '45px 45px 85px 85px', backgroundColor: t.jarBg, overflow: 'hidden', zIndex: 10, pointerEvents: 'none' }}>
        {theme !== 'Ceramic' && <div style={{ position: 'absolute', top: '40px', left: '32px', width: '20px', height: '70%', borderRadius: '9999px', filter: 'blur(4px)', opacity: 0.2, backgroundColor: theme === 'Midnight' ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.6)' }} />}
      </div>
      <div style={{ position: 'absolute', top: '-24px', left: '50%', transform: 'translateX(-50%)', width: '65%', display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 20 }}>
        <div style={{ width: '100%', height: '16px', border: '2px solid ' + t.jarBorder, borderRadius: '8px 8px 0 0', backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,0.6)' : 'rgba(255,255,255,0.7)' }} />
        <div style={{ width: '110%', height: '12px', borderLeft: '2px solid ' + t.jarBorder, borderRight: '2px solid ' + t.jarBorder, borderBottom: '2px solid ' + t.jarBorder, borderRadius: '0 0 6px 6px', backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,0.4)' : 'rgba(255,255,255,0.5)' }} />
      </div>
      <div style={{ position: 'absolute', left: '16px', right: '16px', top: '16px', bottom: '32px', overflow: 'hidden', borderRadius: '35px 35px 75px 75px' }}>
        {marbles.map((marble, index) => {
          const sizePx = SIZE_MAP[marble.size || 'lg'];
          const isXL = marble.size === 'xl';
          const isNewest = index === marbles.length - 1;
          return (
            <div key={marble.id} style={{
              position: 'absolute', width: sizePx + 'px', height: sizePx + 'px', borderRadius: '50%',
              left: marble.position.x + '%', bottom: marble.position.y + '%',
              background: 'radial-gradient(circle at 35% 35%, ' + marble.color + ' 0%, rgba(0,0,0,0.4) 120%)',
              boxShadow: isXL ? '0 0 20px ' + marble.color + 'A0, inset -4px -4px 8px rgba(0,0,0,0.6), inset 4px 4px 8px rgba(255,255,255,0.5)' : 'inset -2px -2px 5px rgba(0,0,0,0.5), inset 2px 2px 5px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: isXL ? 20 : 0,
              opacity: marble.isHonoring ? 0.7 : 1, animation: isNewest ? 'marbleEnter 0.5s ease-out' : undefined
            }}>
              {marble.label && <span style={{ fontSize: '7px', fontWeight: 900, color: 'white', textShadow: '0 1px 3px rgba(0,0,0,0.8)', textAlign: 'center', padding: '0 3px' }}>{marble.label}</span>}
              <div style={{ position: 'absolute', top: '12%', left: '12%', width: '35%', height: '35%', backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: '50%', filter: 'blur(0.8px)' }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Modal: React.FC<{ isOpen: boolean; onClose: () => void; theme: JarTheme; children: React.ReactNode; title?: string; fullScreen?: boolean }> = ({ isOpen, onClose, theme, children, title, fullScreen }) => {
  const t = THEMES[theme];
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: fullScreen ? 'stretch' : 'center', justifyContent: 'center', padding: fullScreen ? 0 : '24px', backgroundColor: fullScreen ? t.bg : 'rgba(15,23,42,0.4)', backdropFilter: fullScreen ? undefined : 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ backgroundColor: t.bg, borderRadius: fullScreen ? 0 : '48px', padding: fullScreen ? '24px' : '32px', width: '100%', maxWidth: fullScreen ? '448px' : '384px', margin: fullScreen ? '0 auto' : 'auto', height: fullScreen ? '100%' : 'auto', display: 'flex', flexDirection: 'column', boxShadow: fullScreen ? undefined : '0 25px 50px -12px rgba(0,0,0,0.25)', border: fullScreen ? undefined : '1px solid ' + t.jarBorder }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: fullScreen ? '48px' : '24px' }}>
            <h2 style={{ fontSize: fullScreen ? '30px' : '20px', fontWeight: 700, color: t.text, fontFamily: 'Georgia, serif' }}>{title}</h2>
            <button onClick={onClose} style={{ padding: '12px', borderRadius: '50%', backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,1)' : 'rgba(226,232,240,1)', color: t.textSoft, border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { const p = JSON.parse(saved); if (!p.milestoneDates) p.milestoneDates = []; return p; }
    } catch (e) { console.error(e); }
    return DEFAULT_STATE;
  });

  const [user, setUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [authMessage, setAuthMessage] = useState('');

  const { playDrop } = useAudio();
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMilestones, setShowMilestones] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [milestoneMsg, setMilestoneMsg] = useState<string | null>(null);
  const [reflection, setReflection] = useState('');
  const [isHonoringPast, setIsHonoringPast] = useState(false);
  const [honoringCount, setHonoringCount] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedColor, setSelectedColor] = useState(CATEGORIES[0].color);
  const [customLabel, setCustomLabel] = useState(CATEGORIES[0].label);
  const [selectedSize, setSelectedSize] = useState<MarbleSize>('lg');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneDate, setNewMilestoneDate] = useState('');

  // Check for existing session on load
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
      if (session?.user) loadFromCloud(session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) loadFromCloud(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Save to localStorage
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error(e); } }, [state]);

  // Auto-save to cloud when state changes (if logged in)
  useEffect(() => {
    if (user && !authLoading) {
      const timeout = setTimeout(() => saveToCloud(), 2000);
      return () => clearTimeout(timeout);
    }
  }, [state, user]);

  const loadFromCloud = async (userId: string) => {
    try {
      const { data, error } = await supabase.from('vaults').select('blob').eq('user_id', userId).single();
      if (error && error.code !== 'PGRST116') throw error;
      if (data?.blob) {
        setState(data.blob as AppState);
      }
    } catch (e) { console.error('Load error:', e); }
  };

  const saveToCloud = async () => {
    if (!user) return;
    setSyncLoading(true);
    try {
      const { error } = await supabase.from('vaults').upsert({ user_id: user.id, blob: state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
      if (error) throw error;
    } catch (e) { console.error('Save error:', e); }
    setSyncLoading(false);
  };

  const handleLogin = async () => {
    if (!emailInput.trim()) return;
    setSyncLoading(true);
    setAuthMessage('');
    try {
      const { error } = await supabase.auth.signInWithOtp({ 
        email: emailInput.trim(),
        options: { emailRedirectTo: window.location.origin }
      });
      if (error) throw error;
      setAuthMessage('Check your email for a magic link!');
    } catch (e: any) { 
      setAuthMessage('Error: ' + e.message); 
    }
    setSyncLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowAccount(false);
  };

  const addMarble = () => {
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
      newMarbles.push({ id, timestamp: isHonoringPast ? Date.now() - (86400000 * (i + 1)) : Date.now(), note: i === 0 ? reflection.trim() : '', color: showAdvanced ? selectedColor : selectedCategory.color, position: { x, y }, isHonoring: isHonoringPast, category: selectedCategory.id, label: customLabel, size: isMilestoneDrop && i === count - 1 ? 'xl' : selectedSize, isMilestone: isMilestoneDrop && i === count - 1 });
    }
    setState(prev => ({ ...prev, marbles: [...prev.marbles, ...newMarbles], lastCheckIn: Date.now(), milestonesReached: isMilestoneDrop ? [...prev.milestonesReached, milestone!] : prev.milestonesReached }));
    setIsCheckInOpen(false); setReflection(''); setIsHonoringPast(false); setHonoringCount(1); setShowAdvanced(false); setSelectedSize('lg'); setIsProcessing(false);
    if (isMilestoneDrop && milestone) setMilestoneMsg(getEncouragement(milestone, state.tone));
  };

  const resetForm = () => { setIsCheckInOpen(false); setReflection(''); setShowAdvanced(false); setCustomLabel(selectedCategory.label); setIsHonoringPast(false); setHonoringCount(1); };
  const addMilestoneDate = () => { if (!newMilestoneName.trim() || !newMilestoneDate) return; setState(prev => ({ ...prev, milestoneDates: [...prev.milestoneDates, { id: Date.now().toString(36), name: newMilestoneName.trim(), date: newMilestoneDate }] })); setNewMilestoneName(''); setNewMilestoneDate(''); };
  const removeMilestoneDate = (id: string) => { setState(prev => ({ ...prev, milestoneDates: prev.milestoneDates.filter(m => m.id !== id) })); };

  const t = THEMES[state.theme];
  const btnStyle = { backgroundColor: t.accent, color: 'white' };
  const btnSecStyle = { backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.4)' : 'white', color: t.text, border: '1px solid ' + t.jarBorder };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <p style={{ color: t.textSoft }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '448px', margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative', backgroundColor: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`@keyframes marbleEnter { from { transform: translateY(-100px) scale(0.5); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }`}</style>
      
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 30 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: t.textSoft }}>Marbleverse</h1>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {syncLoading && <span style={{ fontSize: '10px', color: t.textSoft }}>saving...</span>}
          <button onClick={() => setShowMilestones(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft }}>📅</button>
          <button onClick={() => setShowHistory(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft }}>🕐</button>
          <button onClick={() => setShowSettings(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft }}>⚙️</button>
          <button onClick={() => setShowAccount(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: user ? t.accent : t.textSoft }}>👤</button>
        </div>
      </header>

      {state.milestoneDates.length > 0 && (
        <div style={{ padding: '0 24px', display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {state.milestoneDates.map(m => (
            <div key={m.id} style={{ padding: '6px 12px', borderRadius: '20px', backgroundColor: state.theme === 'Midnight' ? 'rgba(99,102,241,0.2)' : 'rgba(78,205,196,0.15)', border: '1px solid ' + (state.theme === 'Midnight' ? 'rgba(99,102,241,0.3)' : 'rgba(78,205,196,0.3)'), fontSize: '11px', color: t.text }}>
              <span style={{ fontWeight: 600 }}>{m.name}:</span> {getDaysSince(m.date)} days
            </div>
          ))}
        </div>
      )}

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', paddingBottom: '128px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{ fontSize: '72px', fontWeight: 700, fontFamily: 'Georgia, serif', letterSpacing: '-4px', lineHeight: 1, color: t.text }}>{state.marbles.length}</p>
        </div>
        <MarbleJar marbles={state.marbles} theme={state.theme} />
      </main>

      <button onClick={() => setIsCheckInOpen(true)} style={{ position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', width: '64px', height: '64px', borderRadius: '50%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40, border: '1px solid ' + t.jarBorder, cursor: 'pointer', backgroundColor: state.theme === 'Midnight' ? 'rgba(79,70,229,0.6)' : 'white', color: t.textSoft, fontSize: '28px' }}>+</button>

      {/* Account Modal */}
      <Modal isOpen={showAccount} onClose={() => { setShowAccount(false); setAuthMessage(''); }} theme={state.theme} title="Account" fullScreen>
        <div style={{ paddingBottom: '48px' }}>
          {user ? (
            <div>
              <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'rgba(78,205,196,0.1)', border: '1px solid ' + t.jarBorder, marginBottom: '24px' }}>
                <p style={{ fontSize: '12px', color: t.textSoft, marginBottom: '8px' }}>Logged in as</p>
                <p style={{ fontSize: '16px', fontWeight: 600, color: t.text }}>{user.email}</p>
              </div>
              <p style={{ fontSize: '13px', color: t.textSoft, marginBottom: '24px', lineHeight: 1.6 }}>Your marbles automatically sync to the cloud. Use the same email on any device to access them.</p>
              <button onClick={handleLogout} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: '1px solid ' + t.jarBorder, backgroundColor: 'transparent', color: t.text }}>Log Out</button>
            </div>
          ) : (
            <div>
              <p style={{ fontSize: '13px', color: t.textSoft, marginBottom: '24px', lineHeight: 1.6 }}>Sign in to save your marbles to the cloud and access them on any device.</p>
              <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="your@email.com" style={{ width: '100%', boxSizing: 'border-box', borderRadius: '12px', padding: '14px 16px', fontSize: '14px', marginBottom: '12px', outline: 'none', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'white', border: '1px solid ' + t.jarBorder, color: t.text }} />
              <button onClick={handleLogin} disabled={syncLoading} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: 'none', opacity: syncLoading ? 0.5 : 1, ...btnStyle }}>{syncLoading ? 'Sending...' : 'Send Magic Link'}</button>
              {authMessage && <p style={{ marginTop: '16px', fontSize: '13px', color: authMessage.includes('Error') ? '#ef4444' : t.accent, textAlign: 'center' }}>{authMessage}</p>}
            </div>
          )}
        </div>
      </Modal>

      {/* Add Marble Modal */}
      <Modal isOpen={isCheckInOpen} onClose={resetForm} theme={state.theme} title="A moment for you">
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '16px', color: t.textSoft }}>What's the win?</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
            {CATEGORIES.map(cat => (
              <button key={cat.id} onClick={() => { setSelectedCategory(cat); setSelectedColor(cat.color); setCustomLabel(cat.label); }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', padding: '12px', borderRadius: '16px', border: 'none', cursor: 'pointer', ...(selectedCategory.id === cat.id ? btnStyle : btnSecStyle) }}>
                <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'radial-gradient(circle at 35% 35%, ' + cat.color + ' 0%, rgba(0,0,0,0.3) 110%)' }} />
                <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase' }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: '24px' }}>
          <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', color: t.textSoft }}>Label (optional)</label>
          <input type="text" maxLength={8} value={customLabel} onChange={(e) => setCustomLabel(e.target.value.toUpperCase())} placeholder="E.G. HAPPY" style={{ width: '100%', boxSizing: 'border-box', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', fontWeight: 700, letterSpacing: '0.1em', outline: 'none', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'white', border: '1px solid ' + t.jarBorder, color: t.text }} />
        </div>
        <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderRadius: '16px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'rgba(241,245,249,1)', border: '1px solid ' + t.jarBorder }}>
          <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.text }}>Adding history?</span>
          <button onClick={() => setIsHonoringPast(!isHonoringPast)} style={{ width: '40px', height: '24px', borderRadius: '12px', padding: '4px', border: 'none', cursor: 'pointer', backgroundColor: isHonoringPast ? t.accent : 'rgba(203,213,225,1)' }}>
            <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', transform: isHonoringPast ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.3s' }} />
          </button>
        </div>
        {isHonoringPast && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', color: t.textSoft }}>How many?</label>
            <input type="range" min="1" max="20" value={honoringCount} onChange={(e) => setHonoringCount(parseInt(e.target.value))} style={{ width: '100%' }} />
            <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '14px', color: t.text }}>{honoringCount} marbles</div>
          </div>
        )}
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px', display: 'block', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft, padding: 0 }}>{showAdvanced ? "Hide advanced" : "More options"}</button>
        {showAdvanced && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', color: t.textSoft }}>Custom color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {MARBLE_COLORS.map(color => (<button key={color} onClick={() => setSelectedColor(color)} style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid ' + (selectedColor === color ? t.text : t.jarBorder), backgroundColor: color, cursor: 'pointer', transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)' }} />))}
              </div>
            </div>
            <div>
              <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '12px', color: t.textSoft }}>Size</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['sm', 'md', 'lg'] as MarbleSize[]).map(s => (<button key={s} onClick={() => setSelectedSize(s)} style={{ padding: '6px 16px', borderRadius: '8px', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', ...(selectedSize === s ? btnStyle : btnSecStyle) }}>{s}</button>))}
              </div>
            </div>
          </div>
        )}
        <textarea placeholder="Write a tiny note..." value={reflection} onChange={(e) => setReflection(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', height: '80px', padding: '16px', border: 'none', borderBottom: '1px solid ' + t.jarBorder, borderRadius: 0, backgroundColor: 'transparent', resize: 'none', marginBottom: '32px', fontSize: '14px', lineHeight: 1.6, color: t.text, outline: 'none' }} />
        <div style={{ display: 'flex', gap: '16px' }}>
          <button onClick={resetForm} style={{ flex: 1, padding: '16px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft }}>Close</button>
          <button onClick={addMarble} disabled={isProcessing} style={{ flex: 2, padding: '16px', borderRadius: '16px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', cursor: 'pointer', border: 'none', ...btnStyle }}>Drop it in</button>
        </div>
      </Modal>

      {/* Milestones Modal */}
      <Modal isOpen={showMilestones} onClose={() => setShowMilestones(false)} theme={state.theme} title="Important Dates" fullScreen>
        <div style={{ paddingBottom: '48px' }}>
          <p style={{ fontSize: '13px', lineHeight: 1.6, color: t.textSoft, marginBottom: '24px' }}>Track the days since something important — a sober date, a new habit, a fresh start.</p>
          {state.milestoneDates.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              {state.milestoneDates.map(m => (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderRadius: '16px', marginBottom: '12px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'white', border: '1px solid ' + t.jarBorder }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: t.text }}>{m.name}</div>
                    <div style={{ fontSize: '11px', color: t.textSoft, marginTop: '2px' }}>Started {new Date(m.date).toLocaleDateString()}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: t.accent }}>{getDaysSince(m.date)}<span style={{ fontSize: '11px', fontWeight: 500, marginLeft: '4px' }}>days</span></div>
                    <button onClick={() => removeMilestoneDate(m.id)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft, opacity: 0.5 }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.2)' : 'rgba(241,245,249,0.5)', border: '1px solid ' + t.jarBorder }}>
            <label style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: '16px', color: t.textSoft }}>Add a date to track</label>
            <input type="text" value={newMilestoneName} onChange={(e) => setNewMilestoneName(e.target.value)} placeholder="Name (e.g., Sober Date)" style={{ width: '100%', boxSizing: 'border-box', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', marginBottom: '12px', outline: 'none', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'white', border: '1px solid ' + t.jarBorder, color: t.text }} />
            <input type="date" value={newMilestoneDate} onChange={(e) => setNewMilestoneDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', borderRadius: '12px', padding: '12px 16px', fontSize: '14px', marginBottom: '16px', outline: 'none', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'white', border: '1px solid ' + t.jarBorder, color: t.text }} />
            <button onClick={addMilestoneDate} disabled={!newMilestoneName.trim() || !newMilestoneDate} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: 'none', opacity: (!newMilestoneName.trim() || !newMilestoneDate) ? 0.5 : 1, ...btnStyle }}>Add Date</button>
          </div>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} theme={state.theme} title="Settings" fullScreen>
        <div style={{ paddingBottom: '48px' }}>
          <div style={{ padding: '32px', borderRadius: '40px', marginBottom: '48px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'white', border: '1px solid ' + t.jarBorder }}>
            <h3 style={{ fontWeight: 700, textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.1em', color: t.text, marginBottom: '24px' }}>🔊 Sounds</h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: t.text }}>Drop chime</span>
              <button onClick={() => setState({...state, soundEnabled: !state.soundEnabled})} style={{ width: '40px', height: '24px', borderRadius: '12px', padding: '4px', border: 'none', cursor: 'pointer', backgroundColor: state.soundEnabled ? t.accent : 'rgba(203,213,225,1)' }}>
                <div style={{ width: '16px', height: '16px', backgroundColor: 'white', borderRadius: '50%', transform: state.soundEnabled ? 'translateX(16px)' : 'translateX(0)', transition: 'transform 0.3s' }} />
              </button>
            </div>
          </div>
          <div style={{ marginBottom: '48px' }}>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, display: 'block', marginBottom: '20px', color: t.text }}>Atmosphere</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {(['Classic', 'Midnight', 'Ceramic'] as JarTheme[]).map(th => (<button key={th} onClick={() => setState({...state, theme: th})} style={{ padding: '20px', borderRadius: '16px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', transform: state.theme === th ? 'scale(1.05)' : 'scale(1)', border: '2px solid ' + (state.theme === th ? t.accent : t.jarBorder), ...(state.theme === th ? btnStyle : btnSecStyle) }}>{th}</button>))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 800, display: 'block', marginBottom: '20px', color: t.text }}>Voice</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {(['Zen', 'Poetic', 'Grounded'] as TonePreference[]).map(tn => (<button key={tn} onClick={() => setState({...state, tone: tn})} style={{ padding: '20px', borderRadius: '16px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', transform: state.tone === tn ? 'scale(1.05)' : 'scale(1)', border: '2px solid ' + (state.tone === tn ? t.accent : t.jarBorder), ...(state.tone === tn ? btnStyle : btnSecStyle) }}>{tn}</button>))}
            </div>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} theme={state.theme} title="What's in here" fullScreen>
        <div style={{ paddingBottom: '96px' }}>
          {state.marbles.length === 0 ? (<p style={{ textAlign: 'center', color: t.textSoft, fontStyle: 'italic', marginTop: '48px' }}>No marbles yet. Drop your first one.</p>) : (
            [...state.marbles].reverse().map((marble) => (
              <div key={marble.id} style={{ padding: '28px', borderRadius: '40px', marginBottom: '20px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'rgba(255,255,255,0.9)', border: '1px solid ' + t.jarBorder }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em', color: t.text }}>{new Date(marble.timestamp).toLocaleDateString()}</span>
                  {marble.category && <span style={{ fontSize: '8px', fontWeight: 700, padding: '2px 8px', borderRadius: '9999px', textTransform: 'uppercase', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'rgba(241,245,249,1)', color: t.text, border: '1px solid ' + t.jarBorder }}>{marble.category}</span>}
                </div>
                <p style={{ fontStyle: 'italic', lineHeight: 1.6, fontWeight: 600, color: t.text }}>{marble.note || "A little win."}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Milestone Message Modal */}
      {milestoneMsg && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', backgroundColor: 'rgba(15,23,42,0.3)', backdropFilter: 'blur(4px)' }}>
          <div style={{ backgroundColor: t.bg, borderRadius: '40px', padding: '32px', maxWidth: '384px', width: '100%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', border: '1px solid ' + t.jarBorder, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '9999px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '24px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'rgba(227,243,241,0.8)', color: t.accent, border: '1px solid ' + t.jarBorder }}>{state.marbles.length} gathered</div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '24px', fontFamily: 'Georgia, serif', lineHeight: 1.5, color: t.text }}>{milestoneMsg}</h2>
            <button onClick={() => setMilestoneMsg(null)} style={{ width: '100%', marginTop: '16px', padding: '16px 24px', color: 'white', borderRadius: '16px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', backgroundColor: t.accent }}>I'll take that.</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
