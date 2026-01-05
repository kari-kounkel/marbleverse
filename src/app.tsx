import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zlcuuweuzcgaisykuomy.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsY3V1d2V1emNnYWlzeWt1b215Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc1NzA3ODUsImV4cCI6MjA4MzE0Njc4NX0.9bt8AuP89Tm2-lwqxy-0inNjzN7Mhg254qanFG9--ho'
);

type TonePreference = 'Zen' | 'Poetic' | 'Grounded' | 'Christian';
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
  onboardingComplete: boolean;
}

const DEFAULT_STATE: AppState = {
  marbles: [],
  tone: 'Zen',
  theme: 'Classic',
  lastCheckIn: null,
  milestonesReached: [],
  soundEnabled: true,
  milestoneDates: [],
  onboardingComplete: false
};

const STORAGE_KEY = 'marbleverse_state_v5';
const UNLOCK_KEY = 'marbleverse_unlocked';
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
    7: ["Seven days. You showed up seven times. That's a whole week of trying.", "Look at you, collecting moments like seashells.", "A week of small yeses. The jar notices."],
    13: ["Thirteen! The universe's favorite weirdo number.", "A baker's dozen of grace.", "13 marbles. Some think that's unlucky. They're wrong."],
    30: ["Thirty whole days of not giving up.", "A month! You can do hard things for 30 days.", "30 marbles sitting pretty. You built that."],
    60: ["Sixty days. Two whole months of choosing yourself.", "Look at this jar getting crowded.", "Two months of showing up."],
    90: ["90 DAYS. A whole season.", "A quarter year of tiny wins.", "90 marbles. A chicken clucks in your honor."],
    100: ["TRIPLE DIGITS. You absolute legend.", "One hundred. You did that.", "100 moments of not quitting."],
    365: ["A YEAR. 365 days of gathering yourself.", "One whole trip around the sun.", "365 marbles. Proof you can do hard things."]
  },
  Poetic: {
    7: ["Seven small stones, stacking toward something bigger.", "A week of breadcrumbs leading you home.", "Seven stars in your pocket."],
    13: ["Thirteen — the number of misfits and miracles.", "A sideways dozen plus grace.", "Thirteen whispers of 'I think I can.'"],
    30: ["A moon has waxed and waned while you gathered these.", "One month of stitching yourself back together.", "Thirty sunrises you didn't waste."],
    60: ["Sixty pearls on a string of ordinary days.", "Two moons of quiet revolution.", "Sixty chapters in the language of showing up."],
    90: ["A season. You've weathered a whole season of becoming.", "Ninety threads woven into hope.", "The jar grows heavy with gathered grace."],
    100: ["A hundred small rebellions against giving up.", "Triple digits of stubborn, beautiful trying.", "One hundred love letters to your future self."],
    365: ["A year held in glass.", "365 acts of faith that tomorrow could be different.", "The jar overflows with a year of not quitting."]
  },
  Grounded: {
    7: ["Seven days. You showed up. That's the assignment.", "A week in the jar. Not bad.", "7 down. More where that came from."],
    13: ["13 marbles. Luck had nothing to do with it.", "Thirteen. Building something real.", "A baker's dozen of 'I did that.'"],
    30: ["A month. Not a fluke — a pattern.", "30 days of doing the thing.", "One month of receipts."],
    60: ["Two months. Not a phase anymore.", "60 marbles don't lie.", "Halfway to 90."],
    90: ["90 days. You've made a habit of not giving up.", "Three months of proof.", "90 marbles. Weight. Substance. You."],
    100: ["Triple digits. The hundred club.", "100. A HUNDRED. Say it out loud.", "Welcome to 100."],
    365: ["365 days. One whole year of choosing yourself.", "A year becoming someone who doesn't quit.", "365 marbles. Days you thought you couldn't."]
  },
  Christian: {
    7: ["'For seven days celebrate the festival to the Lord.' — Deut. 16:15. A week of faithfulness.", "Seven days. Even God rested on the seventh. You showed up all seven.", "The Lord made the world in seven days. You made a week of victories."],
    13: ["'I can do all things through Christ who strengthens me.' — Phil. 4:13. Thirteen things and counting.", "Thirteen graces gathered. His mercies are new every morning.", "13 marbles of faith, each one a mustard seed."],
    30: ["'Be still before the Lord and wait patiently for him.' — Psalm 37:7. Thirty days of waiting well.", "A month of manna — daily bread, daily showing up.", "'His faithfulness continues through all generations.' Thirty days of yours."],
    60: ["'They who wait upon the Lord shall renew their strength.' — Isaiah 40:31. Sixty days of renewed strength.", "Two months. 'He gives power to the weak.' You received it.", "'The Lord is my strength and my song.' — Exodus 15:2. Sixty days of song."],
    90: ["'Let us not become weary in doing good, for at the proper time we will reap.' — Gal. 6:9. Ninety days sown.", "A season of faithfulness. 'To everything there is a season.' This one is yours.", "'He has made everything beautiful in its time.' — Eccl. 3:11. Ninety beautiful days."],
    100: ["'The Lord is my shepherd; I shall not want.' — Psalm 23:1. One hundred days of being led.", "Triple digits! 'Great is Thy faithfulness.' One hundred times over.", "'With God all things are possible.' — Matt. 19:26. You proved it 100 times."],
    365: ["'His mercies are new every morning.' — Lam. 3:23. You collected 365 of them.", "A year! 'The steadfast love of the Lord never ceases.' 365 days of steadfast love.", "'Surely goodness and mercy shall follow me all the days of my life.' — Psalm 23:6. All 365."]
  }
};

const ONBOARDING_SLIDES = [
  { title: "Welcome to Marbleverse", subtitle: "A jar for your wins", description: "Every small victory deserves a marble. Sobriety. Hydration. Movement. Rest. Whatever you're tracking, drop it in the jar." },
  { title: "Track Important Dates", subtitle: "Count the days that matter", description: "Add your sober date, your fresh-start date, or any milestone. Watch the days add up right on your home screen." },
  { title: "Choose Your Voice", subtitle: "Encouragement your way", description: "Pick Zen, Poetic, Grounded, or Christian. When you hit a milestone, you'll get a message in the voice that speaks to you." },
  { title: "Sync Across Devices", subtitle: "Your marbles follow you", description: "Your marbles save automatically. Use the same code on any device to access them." },
  { title: "Add to Home Screen", subtitle: "Make it feel like an app", description: "iPhone: Tap the Share button, then 'Add to Home Screen.' Android: Tap the menu (⋮), then 'Add to Home Screen' or 'Install.' Now you'll have an icon!" }
];

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

// ========== CODE GATE COMPONENT ==========
const CodeGate: React.FC<{ onUnlock: (code: string) => void }> = ({ onUnlock }) => {
  const [codeInput, setCodeInput] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async () => {
    if (!codeInput.trim()) return;
    setChecking(true);
    setError('');
    
    try {
      const { data, error: fetchError } = await supabase
        .from('codes')
        .select('id, used_by')
        .eq('code', codeInput.trim().toUpperCase())
        .single();
      
      if (fetchError || !data) {
        setError('Invalid code. Please check and try again.');
        setChecking(false);
        return;
      }
      
      if (data.used_by) {
        // Code already used - but that's okay, let them in if it's their code
        // For now, just let anyone with a valid code in
      }
      
      // Valid code - unlock the app
      onUnlock(codeInput.trim().toUpperCase());
      
    } catch (e) {
      setError('Something went wrong. Please try again.');
    }
    setChecking(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', padding: '32px', maxWidth: '448px', margin: '0 auto' }}>
      <img src="/jar.svg" alt="Marble jar" style={{ width: '120px', height: '156px', marginBottom: '32px' }} />
      <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', fontFamily: 'Georgia, serif', textAlign: 'center' }}>Welcome to Marbleverse</h1>
      <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '32px', textAlign: 'center', lineHeight: 1.6 }}>Enter your access code to unlock the app.</p>
      
      <input
        type="text"
        value={codeInput}
        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
        placeholder="ENTER CODE"
        style={{
          width: '100%',
          maxWidth: '280px',
          padding: '16px 20px',
          fontSize: '18px',
          fontWeight: 700,
          letterSpacing: '0.15em',
          textAlign: 'center',
          border: '2px solid #e2e8f0',
          borderRadius: '16px',
          outline: 'none',
          marginBottom: '16px'
        }}
        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
      />
      
      <button
        onClick={handleSubmit}
        disabled={checking || !codeInput.trim()}
        style={{
          width: '100%',
          maxWidth: '280px',
          padding: '16px',
          fontSize: '14px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          backgroundColor: '#4ECDC4',
          color: 'white',
          border: 'none',
          borderRadius: '16px',
          cursor: 'pointer',
          opacity: checking || !codeInput.trim() ? 0.5 : 1
        }}
      >
        {checking ? 'Checking...' : 'Unlock'}
      </button>
      
      {error && <p style={{ marginTop: '16px', fontSize: '14px', color: '#ef4444', textAlign: 'center' }}>{error}</p>}
      
      <p style={{ marginTop: '48px', fontSize: '12px', color: '#94a3b8', textAlign: 'center' }}>
        Don't have a code?<br />
        <a href="https://marbleverse.com" style={{ color: '#4ECDC4' }}>Get access at marbleverse.com</a>
      </p>
    </div>
  );
};

// ========== ONBOARDING COMPONENT ==========
const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const isLast = currentSlide === ONBOARDING_SLIDES.length - 1;
  const slide = ONBOARDING_SLIDES[currentSlide];
  
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', padding: '48px 32px', maxWidth: '448px', margin: '0 auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: '64px', marginBottom: '32px' }}>
          {currentSlide === 0 && <img src="/jar.svg" alt="Marble jar" style={{ width: '120px', height: '156px', margin: '0 auto' }} />}
          {currentSlide === 1 && '📅'}
          {currentSlide === 2 && '💬'}
          {currentSlide === 3 && '☁️'}
          {currentSlide === 4 && '📱'}
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', marginBottom: '8px', fontFamily: 'Georgia, serif' }}>{slide.title}</h1>
        <p style={{ fontSize: '14px', fontWeight: 600, color: '#4ECDC4', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '24px' }}>{slide.subtitle}</p>
        <p style={{ fontSize: '16px', color: '#64748b', lineHeight: 1.7 }}>{slide.description}</p>
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
        {ONBOARDING_SLIDES.map((_, i) => (
          <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: i === currentSlide ? '#4ECDC4' : '#e2e8f0' }} />
        ))}
      </div>
      
      <div style={{ display: 'flex', gap: '16px' }}>
        {currentSlide > 0 && (
          <button onClick={() => setCurrentSlide(currentSlide - 1)} style={{ flex: 1, padding: '16px', fontSize: '14px', fontWeight: 700, backgroundColor: 'transparent', border: '1px solid #e2e8f0', borderRadius: '16px', cursor: 'pointer', color: '#64748b' }}>Back</button>
        )}
        <button onClick={() => isLast ? onComplete() : setCurrentSlide(currentSlide + 1)} style={{ flex: 2, padding: '16px', fontSize: '14px', fontWeight: 700, backgroundColor: '#4ECDC4', color: 'white', border: 'none', borderRadius: '16px', cursor: 'pointer' }}>
          {isLast ? "Let's Go!" : 'Next'}
        </button>
      </div>
    </div>
  );
};

// ========== MARBLE JAR COMPONENT ==========
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

// ========== MODAL COMPONENT ==========
const Modal: React.FC<{ isOpen: boolean; onClose: () => void; theme: JarTheme; children: React.ReactNode; title?: string; fullScreen?: boolean }> = ({ isOpen, onClose, theme, children, title, fullScreen }) => {
  const t = THEMES[theme];
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: fullScreen ? 'stretch' : 'center', justifyContent: 'center', padding: fullScreen ? 0 : '24px', backgroundColor: fullScreen ? t.bg : 'rgba(15,23,42,0.4)', backdropFilter: fullScreen ? undefined : 'blur(4px)', overflowY: 'auto' }}>
      <div style={{ backgroundColor: t.bg, borderRadius: fullScreen ? 0 : '48px', padding: fullScreen ? '24px' : '32px', width: '100%', maxWidth: fullScreen ? '448px' : '384px', margin: fullScreen ? '0 auto' : 'auto', height: fullScreen ? '100%' : 'auto', display: 'flex', flexDirection: 'column', boxShadow: fullScreen ? undefined : '0 25px 50px -12px rgba(0,0,0,0.25)', border: fullScreen ? undefined : '1px solid ' + t.jarBorder }}>
        {title && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: fullScreen ? '48px' : '24px' }}>
            <h2 style={{ fontSize: fullScreen ? '30px' : '20px', fontWeight: 700, color: t.text, fontFamily: 'Georgia, serif' }}>{title}</h2>
            <button onClick={onClose} style={{ padding: '12px', borderRadius: '50%', backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,1)' : 'rgba(226,232,240,1)', color: t.textSoft, border: 'none', cursor: 'pointer', fontSize: '18px' }}>✕</button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
};

// ========== MAIN APP ==========
const App: React.FC = () => {
  // Check if app is unlocked
  const [isUnlocked, setIsUnlocked] = useState(() => {
    try {
      return localStorage.getItem(UNLOCK_KEY) !== null;
    } catch (e) { return false; }
  });
  
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) { 
        const p = JSON.parse(saved); 
        if (!p.milestoneDates) p.milestoneDates = []; 
        if (p.onboardingComplete === undefined) p.onboardingComplete = false;
        return p; 
      }
    } catch (e) { console.error(e); }
    return DEFAULT_STATE;
  });

  const [syncLoading, setSyncLoading] = useState(false);

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

  const unlockCode = localStorage.getItem(UNLOCK_KEY);

  useEffect(() => { 
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { console.error(e); } 
  }, [state]);

  // Auto-save to cloud using the code as identifier
  useEffect(() => {
    if (isUnlocked && unlockCode) {
      const timeout = setTimeout(() => saveToCloud(), 2000);
      return () => clearTimeout(timeout);
    }
  }, [state, isUnlocked]);

  // Load from cloud when unlocked
  useEffect(() => {
    if (isUnlocked && unlockCode) {
      loadFromCloud();
    }
  }, [isUnlocked]);

  const loadFromCloud = async () => {
    if (!unlockCode) return;
    try {
      const { data, error } = await supabase
        .from('codes')
        .select('id')
        .eq('code', unlockCode)
        .single();
      
      if (data) {
        const { data: vaultData } = await supabase
          .from('vaults')
          .select('blob')
          .eq('user_id', data.id)
          .single();
        
        if (vaultData?.blob) {
          const cloudState = vaultData.blob as AppState;
          setState(prev => ({ ...cloudState, onboardingComplete: prev.onboardingComplete || cloudState.onboardingComplete }));
        }
      }
    } catch (e) { console.error('Load error:', e); }
  };

  const saveToCloud = async () => {
    if (!unlockCode) return;
    setSyncLoading(true);
    try {
      const { data: codeData } = await supabase
        .from('codes')
        .select('id')
        .eq('code', unlockCode)
        .single();
      
      if (codeData) {
        await supabase.from('vaults').upsert({ 
          user_id: codeData.id, 
          blob: state, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'user_id' });
      }
    } catch (e) { console.error('Save error:', e); }
    setSyncLoading(false);
  };

  const handleUnlock = (code: string) => {
    localStorage.setItem(UNLOCK_KEY, code);
    setIsUnlocked(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(UNLOCK_KEY);
    setIsUnlocked(false);
    setShowAccount(false);
  };

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, onboardingComplete: true }));
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

  // Show code gate if not unlocked
  if (!isUnlocked) {
    return <CodeGate onUnlock={handleUnlock} />;
  }

  // Show onboarding if not complete
  if (!state.onboardingComplete) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '448px', margin: '0 auto', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', overflow: 'hidden', position: 'relative', backgroundColor: t.bg, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <style>{`@keyframes marbleEnter { from { transform: translateY(-100px) scale(0.5); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }`}</style>
      
      <header style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 30 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: t.textSoft }}>Marbleverse</h1>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          {syncLoading && <span style={{ fontSize: '10px', color: t.textSoft }}>saving...</span>}
          <button onClick={() => setShowMilestones(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft, fontSize: '18px' }}>📅</button>
          <button onClick={() => setShowHistory(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft, fontSize: '18px' }}>🕐</button>
          <button onClick={() => setShowSettings(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft, fontSize: '18px' }}>⚙️</button>
          <button onClick={() => setShowAccount(true)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', fontSize: '18px', color: t.accent }}>👤</button>
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
      <Modal isOpen={showAccount} onClose={() => setShowAccount(false)} theme={state.theme} title="Account" fullScreen>
        <div style={{ paddingBottom: '48px' }}>
          <div style={{ padding: '24px', borderRadius: '24px', backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'rgba(78,205,196,0.1)', border: '1px solid ' + t.jarBorder, marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
            <p style={{ fontSize: '12px', color: t.textSoft, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Unlocked with code</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: t.text, letterSpacing: '0.1em' }}>{unlockCode}</p>
          </div>
          <p style={{ fontSize: '13px', color: t.textSoft, marginBottom: '24px', lineHeight: 1.6 }}>Your marbles automatically sync to the cloud. Use this same code on any device to access them.</p>
          <button onClick={handleLogout} style={{ width: '100%', padding: '14px', borderRadius: '12px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', border: '1px solid ' + t.jarBorder, backgroundColor: 'transparent', color: t.text }}>Log Out</button>
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
                    <button onClick={() => removeMilestoneDate(m.id)} style={{ padding: '8px', backgroundColor: 'transparent', border: 'none', cursor: 'pointer', color: t.textSoft, opacity: 0.5, fontSize: '16px' }}>🗑️</button>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {(['Zen', 'Poetic', 'Grounded', 'Christian'] as TonePreference[]).map(tn => (<button key={tn} onClick={() => setState({...state, tone: tn})} style={{ padding: '20px', borderRadius: '16px', fontSize: '10px', fontWeight: 900, cursor: 'pointer', transform: state.tone === tn ? 'scale(1.05)' : 'scale(1)', border: '2px solid ' + (state.tone === tn ? t.accent : t.jarBorder), ...(state.tone === tn ? btnStyle : btnSecStyle) }}>{tn}</button>))}
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
            <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '24px', fontFamily: 'Georgia, serif', lineHeight: 1.6, color: t.text }}>{milestoneMsg}</h2>
            <button onClick={() => setMilestoneMsg(null)} style={{ width: '100%', marginTop: '16px', padding: '16px 24px', color: 'white', borderRadius: '16px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', backgroundColor: t.accent }}>I'll take that.</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
