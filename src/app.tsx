import React, { useState, useEffect, useRef } from 'react';

// ============ TYPES ============
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

interface AppState {
  marbles: Marble[];
  tone: TonePreference;
  theme: JarTheme;
  lastCheckIn: number | null;
  milestonesReached: number[];
  soundEnabled: boolean;
}

// ============ CONSTANTS ============
const STORAGE_KEY = 'marbleverse_state_v3';
const MILESTONES = [7, 13, 30, 60, 90, 100, 365];

const MARBLE_COLORS = [
  '#4ECDC4', '#FF8C42', '#FFD700', '#4361EE',
  '#F72585', '#70E000', '#9B5DE5', '#00BBF9',
];

const CATEGORIES = [
  { id: 'sober', name: 'Sobriety', label: 'SOBER', color: '#4361EE' },
  { id: 'water', name: 'Hydration', label: 'WATER', color: '#4ECDC4' },
  { id: 'move', name: 'Movement', label: 'MOVE', color: '#70E000' },
  { id: 'rest', name: 'Rest', label: 'REST', color: '#9B5DE5' },
  { id: 'general', name: 'General', label: '', color: '#FFD700' },
];

const THEMES: Record<JarTheme, { bg: string; jarBorder: string; jarBg: string; text: string; accent: string }> = {
  Classic: {
    bg: '#E3F3F1',
    jarBorder: 'rgba(255,255,255,0.8)',
    jarBg: 'rgba(255,255,255,0.1)',
    text: '#1e293b',
    accent: '#1e293b'
  },
  Midnight: {
    bg: '#0a0a0c',
    jarBorder: 'rgba(129,140,248,0.3)',
    jarBg: 'rgba(49,46,129,0.1)',
    text: '#e0e7ff',
    accent: '#818cf8'
  },
  Ceramic: {
    bg: '#f5ebe0',
    jarBorder: 'rgba(120,113,108,0.4)',
    jarBg: 'rgba(214,211,209,0.2)',
    text: '#292524',
    accent: '#78716c'
  }
};

// ============ ENCOURAGEMENT MESSAGES ============
const ENCOURAGEMENTS: Record<TonePreference, Record<number, string[]>> = {
  Zen: {
    7: ["Seven. A week of showing up.", "One week. You're here.", "Seven moments. All yours."],
    13: ["Thirteen. Lucky you showed up.", "13 gathered. Keep going.", "A baker's dozen of grace."],
    30: ["A whole month of noticing.", "30. That's not nothing.", "Month one. You made it."],
    60: ["Two months of small wins.", "60. Look at that.", "Sixty moments of care."],
    90: ["90 days. A season of you.", "Quarter year. Still here.", "90. That matters."],
    100: ["Triple digits. Wow.", "100. You built this.", "A hundred tiny yeses."],
    365: ["A year. A whole year.", "365. You stayed.", "One year of showing up for yourself."]
  },
  Poetic: {
    7: ["Seven stars in your pocket now.", "A week woven, thread by thread.", "Seven seeds, already growing."],
    13: ["Thirteen whispers of 'I can.'", "A constellation forming.", "Lucky thirteen, indeed."],
    30: ["A moon cycle of kindness to yourself.", "Thirty sunrises you claimed.", "One month, painted in small victories."],
    60: ["Sixty pearls on a string of days.", "Two moons of gathering light.", "The jar fills like a poem."],
    90: ["A season inscribed in glass.", "Ninety chapters of your story.", "Spring, summer, or fall — you bloomed."],
    100: ["A century of small revolutions.", "One hundred acts of quiet courage.", "The hundredth marble catches all the light."],
    365: ["A year held in your hands.", "365 days of choosing yourself.", "The jar overflows with a year of you."]
  },
  Grounded: {
    7: ["Week one done. Not bad.", "Seven. You actually did it.", "That's a week. Real progress."],
    13: ["13 in the jar. Solid.", "You're building something here.", "Thirteen wins. Keep stacking."],
    30: ["A month. That's discipline.", "30 days of showing up. Respect.", "Month one complete. Nice work."],
    60: ["Two months strong.", "60. You're not messing around.", "Halfway to 90. Keep going."],
    90: ["90 days. That's a habit now.", "Three months of work. It shows.", "90. You earned every one."],
    100: ["100. That's a real number.", "Triple digits. You built this.", "A hundred wins. Own that."],
    365: ["365. A whole damn year.", "You did this for a year. Incredible.", "One year. You showed up 365 times."]
  }
};

const getEncouragement = (count: number, tone: TonePreference): string => {
  const milestone = MILESTONES.find(m => m === count) || MILESTONES[MILESTONES.length - 1];
  const messages = ENCOURAGEMENTS[tone][milestone] || ENCOURAGEMENTS[tone][7];
  return messages[Math.floor(Math.random() * messages.length)];
};

// ============ SIZE MAP ============
const SIZE_MAP: Record<MarbleSize, number> = {
  sm: 22,
  md: 30,
  lg: 44,
  xl: 58
};

// ============ AUDIO HOOK ============
const useAudio = () => {
  const audioCtx = useRef<AudioContext | null>(null);

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

    const pitchShift = (Math.random() - 0.5) * 200;

    // Plink
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(3200 + pitchShift, now);
    osc1.frequency.exponentialRampToValueAtTime(1200 + pitchShift, now + 0.04);
    gain1.gain.setValueAtTime(0.06, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    // Body
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(520 + pitchShift, now);
    osc2.frequency.exponentialRampToValueAtTime(440 + pitchShift, now + 0.2);
    gain2.gain.setValueAtTime(0.04, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.2);
    osc2.stop(now + 0.3);
  };

  return { playDrop };
};

// ============ ICONS ============
const PlusIcon = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"></circle>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
  </svg>
);

const HistoryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <polyline points="12 6 12 12 16 14"></polyline>
  </svg>
);

const VolumeIcon = ({ muted }: { muted: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {muted ? (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <line x1="23" y1="9" x2="17" y2="15"></line>
        <line x1="17" y1="9" x2="23" y2="15"></line>
      </>
    ) : (
      <>
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
      </>
    )}
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

// ============ MARBLE JAR COMPONENT ============
const MarbleJar: React.FC<{ marbles: Marble[]; theme: JarTheme }> = ({ marbles, theme }) => {
  const currentTheme = THEMES[theme];
  
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      maxWidth: '320px',
      aspectRatio: '3 / 4.5',
      margin: '2rem auto 0'
    }}>
      {/* Jar Silhouette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        border: `3.5px solid ${currentTheme.jarBorder}`,
        borderRadius: '45px 45px 85px 85px',
        backgroundColor: currentTheme.jarBg,
        backdropFilter: 'blur(2px)',
        overflow: 'hidden',
        zIndex: 10,
        pointerEvents: 'none',
        transition: 'all 0.7s ease'
      }}>
        {/* Glass Reflections */}
        {theme !== 'Ceramic' && (
          <>
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '32px',
              width: '24px',
              height: '75%',
              borderRadius: '9999px',
              filter: 'blur(3px)',
              opacity: 0.4,
              backgroundColor: theme === 'Midnight' ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.5)'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '64px',
              right: '40px',
              width: '16px',
              height: '20%',
              borderRadius: '9999px',
              filter: 'blur(2px)',
              opacity: 0.2,
              backgroundColor: theme === 'Midnight' ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.3)'
            }} />
          </>
        )}
      </div>

      {/* Jar Neck */}
      <div style={{
        position: 'absolute',
        top: '-24px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '65%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 20
      }}>
        <div style={{
          width: '100%',
          height: '16px',
          border: `2px solid ${currentTheme.jarBorder}`,
          borderRadius: '8px 8px 0 0',
          backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,0.8)' : 'rgba(255,255,255,0.8)',
          transition: 'all 0.7s ease'
        }} />
        <div style={{
          width: '110%',
          height: '12px',
          borderLeft: `2px solid ${currentTheme.jarBorder}`,
          borderRight: `2px solid ${currentTheme.jarBorder}`,
          borderBottom: `2px solid ${currentTheme.jarBorder}`,
          borderRadius: '0 0 6px 6px',
          backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,0.6)' : 'rgba(255,255,255,0.6)',
          transition: 'all 0.7s ease'
        }} />
      </div>

      {/* Marbles Container */}
      <div style={{
        position: 'absolute',
        left: '16px',
        right: '16px',
        top: '16px',
        bottom: '32px',
        overflow: 'hidden',
        borderRadius: '35px 35px 75px 75px'
      }}>
        {marbles.map((marble, index) => {
          const marbleSize = marble.size || 'lg';
          const sizePx = SIZE_MAP[marbleSize];
          const isXL = marbleSize === 'xl';
          const isNewest = index === marbles.length - 1;

          return (
            <div
              key={marble.id}
              style={{
                position: 'absolute',
                width: `${sizePx}px`,
                height: `${sizePx}px`,
                borderRadius: '50%',
                left: `${marble.position.x}%`,
                bottom: `${marble.position.y}%`,
                background: `radial-gradient(circle at 35% 35%, ${marble.color} 0%, rgba(0,0,0,0.4) 120%)`,
                boxShadow: isXL 
                  ? `0 0 20px ${marble.color}A0, inset -4px -4px 8px rgba(0,0,0,0.6), inset 4px 4px 8px rgba(255,255,255,0.5), 0 6px 14px rgba(0,0,0,0.4)`
                  : `inset -2px -2px 5px rgba(0,0,0,0.5), inset 2px 2px 5px rgba(255,255,255,0.4), 0 3px 8px rgba(0,0,0,0.3)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                zIndex: isXL ? 20 : 0,
                opacity: marble.isHonoring ? 0.7 : 1,
                filter: marble.isHonoring ? 'saturate(0.5)' : 'none',
                animation: isNewest ? 'marbleEnter 0.5s ease-out' : undefined,
                transition: 'opacity 0.5s ease'
              }}
            >
              {/* Label */}
              {marble.label && (
                <span style={{
                  fontSize: '8px',
                  fontWeight: 900,
                  color: 'white',
                  letterSpacing: '-0.5px',
                  textTransform: 'uppercase',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                  textAlign: 'center',
                  padding: '0 4px',
                  userSelect: 'none',
                  pointerEvents: 'none'
                }}>
                  {marble.label}
                </span>
              )}

              {/* Specular Highlight */}
              <div style={{
                position: 'absolute',
                top: '12%',
                left: '12%',
                width: '35%',
                height: '35%',
                backgroundColor: 'rgba(255,255,255,0.4)',
                borderRadius: '50%',
                filter: 'blur(0.8px)'
              }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ MODAL COMPONENT ============
const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  theme: JarTheme;
  children: React.ReactNode;
  title?: string;
  fullScreen?: boolean;
}> = ({ isOpen, onClose, theme, children, title, fullScreen }) => {
  const currentTheme = THEMES[theme];
  
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: fullScreen ? 'stretch' : 'center',
      justifyContent: 'center',
      padding: fullScreen ? 0 : '24px',
      backgroundColor: fullScreen ? currentTheme.bg : 'rgba(15,23,42,0.4)',
      backdropFilter: fullScreen ? undefined : 'blur(4px)',
      overflowY: 'auto',
      transition: 'background-color 0.5s ease'
    }}>
      <div style={{
        backgroundColor: currentTheme.bg,
        borderRadius: fullScreen ? 0 : '48px',
        padding: fullScreen ? '24px' : '32px',
        width: '100%',
        maxWidth: fullScreen ? '448px' : '384px',
        margin: fullScreen ? '0 auto' : 'auto',
        height: fullScreen ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: fullScreen ? undefined : '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: fullScreen ? undefined : '1px solid rgba(255,255,255,0.2)',
        transition: 'background-color 0.5s ease'
      }}>
        {title && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: fullScreen ? '48px' : '24px'
          }}>
            <h2 style={{
              fontSize: fullScreen ? '30px' : '20px',
              fontWeight: 700,
              color: currentTheme.text,
              fontFamily: 'Georgia, serif'
            }}>{title}</h2>
            <button
              onClick={onClose}
              style={{
                padding: '12px',
                borderRadius: '50%',
                backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,1)' : 'rgba(226,232,240,1)',
                color: theme === 'Midnight' ? 'rgba(165,180,252,1)' : 'rgba(71,85,105,1)',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <CloseIcon />
            </button>
          </div>
        )}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

// ============ ENCOURAGEMENT MODAL ============
const EncouragementModal: React.FC<{
  message: string;
  count: number;
  onClose: () => void;
  theme: JarTheme;
}> = ({ message, count, onClose, theme }) => {
  const currentTheme = THEMES[theme];
  
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      backgroundColor: 'rgba(15,23,42,0.3)',
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: currentTheme.bg,
        borderRadius: '40px',
        padding: '32px',
        maxWidth: '384px',
        width: '100%',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        border: `1px solid ${theme === 'Midnight' ? 'rgba(129,140,248,0.2)' : 'rgba(255,255,255,0.5)'}`,
        textAlign: 'center',
        animation: 'modalEnter 0.3s ease-out'
      }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 16px',
          borderRadius: '9999px',
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: '24px',
          backgroundColor: theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'rgba(254,249,195,1)',
          color: theme === 'Midnight' ? 'rgba(199,210,254,1)' : 'rgba(161,98,7,1)',
          border: `1px solid ${theme === 'Midnight' ? 'rgba(99,102,241,0.3)' : 'rgba(254,240,138,1)'}`
        }}>
          {count} gathered
        </div>
        <h2 style={{
          fontSize: '24px',
          fontWeight: 700,
          marginBottom: '24px',
          fontFamily: 'Georgia, serif',
          lineHeight: 1.4,
          color: currentTheme.text
        }}>{message}</h2>
        <button
          onClick={onClose}
          style={{
            width: '100%',
            marginTop: '16px',
            padding: '16px 24px',
            color: 'white',
            borderRadius: '16px',
            fontWeight: 700,
            fontSize: '12px',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: theme === 'Midnight' ? 'rgba(79,70,229,1)' : 'rgba(30,41,59,1)',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
            transition: 'transform 0.1s ease'
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          I'll take that.
        </button>
      </div>
    </div>
  );
};

// ============ MAIN APP ============
const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load state:', e);
    }
    return {
      marbles: [],
      tone: 'Zen' as TonePreference,
      theme: 'Classic' as JarTheme,
      lastCheckIn: null,
      milestonesReached: [],
      soundEnabled: true
    };
  });

  const { playDrop } = useAudio();

  // Modal states
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [currentMilestoneMessage, setCurrentMilestoneMessage] = useState<string | null>(null);

  // Form states
  const [reflection, setReflection] = useState('');
  const [isHonoringPast, setIsHonoringPast] = useState(false);
  const [honoringCount, setHonoringCount] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [selectedColor, setSelectedColor] = useState(CATEGORIES[0].color);
  const [customLabel, setCustomLabel] = useState(CATEGORIES[0].label);
  const [selectedSize, setSelectedSize] = useState<MarbleSize>('lg');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Save state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save state:', e);
    }
  }, [state]);

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
    
    setState(prev => ({ 
      ...prev, 
      marbles: updatedMarbles, 
      lastCheckIn: Date.now(),
      milestonesReached: isMilestoneDrop ? [...prev.milestonesReached, milestone!] : prev.milestonesReached
    }));
    
    // Reset form
    setIsCheckInOpen(false);
    setReflection('');
    setIsHonoringPast(false);
    setHonoringCount(1);
    setShowAdvanced(false);
    setSelectedSize('lg');
    setIsProcessing(false);
    
    // Show milestone message
    if (isMilestoneDrop) {
      const message = getEncouragement(newTotal, state.tone);
      setCurrentMilestoneMessage(message);
    }
  };

  const resetCheckInForm = () => {
    setIsCheckInOpen(false);
    setReflection('');
    setShowAdvanced(false);
    setCustomLabel(selectedCategory.label);
    setIsHonoringPast(false);
    setHonoringCount(1);
  };

  const currentTheme = THEMES[state.theme];

  const buttonStyle = {
    backgroundColor: state.theme === 'Midnight' ? 'rgba(79,70,229,1)' : 'rgba(30,41,59,1)',
    color: 'white'
  };

  const secondaryButtonStyle = {
    backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.4)' : 'white',
    color: currentTheme.text,
    border: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.2)' : 'rgba(203,213,225,1)'}`
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: '448px',
      margin: '0 auto',
      boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
      overflow: 'hidden',
      position: 'relative',
      backgroundColor: currentTheme.bg,
      transition: 'background-color 0.7s ease',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* Keyframes */}
      <style>{`
        @keyframes marbleEnter {
          from {
            transform: translateY(-100px) scale(0.5);
            opacity: 0;
          }
          to {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }
        @keyframes modalEnter {
          from {
            transform: scale(0.9);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>

      {/* Header */}
      <header style={{
        padding: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.05)',
        backdropFilter: 'blur(4px)',
        position: 'sticky',
        top: 0,
        zIndex: 30
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: 800,
          letterSpacing: '-0.5px',
          textTransform: 'uppercase',
          color: currentTheme.text
        }}>Marbleverse</h1>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setShowHistory(true)}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: currentTheme.text,
              opacity: 0.9
            }}
          >
            <HistoryIcon />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: currentTheme.text,
              opacity: 0.9
            }}
          >
            <SettingsIcon />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        paddingBottom: '128px',
        position: 'relative'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <p style={{
            fontSize: '72px',
            fontWeight: 800,
            fontFamily: 'Georgia, serif',
            letterSpacing: '-4px',
            lineHeight: 1,
            color: currentTheme.text,
            transition: 'color 1s ease'
          }}>{state.marbles.length}</p>
        </div>
        
        <MarbleJar marbles={state.marbles} theme={state.theme} />
      </main>

      {/* Add Button */}
      <button
        onClick={() => setIsCheckInOpen(true)}
        style={{
          position: 'fixed',
          bottom: '40px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '64px',
          height: '64px',
          borderRadius: '50%',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 40,
          border: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.4)' : 'rgba(245,245,244,1)'}`,
          cursor: 'pointer',
          backgroundColor: state.theme === 'Midnight' ? 'rgba(79,70,229,0.6)' : 'white',
          color: state.theme === 'Midnight' ? 'rgba(238,242,255,1)' : 'rgba(71,85,105,1)',
          transition: 'transform 0.1s ease'
        }}
        onMouseDown={(e) => (e.currentTarget.style.transform = 'translateX(-50%) scale(0.9)')}
        onMouseUp={(e) => (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
      >
        <PlusIcon />
      </button>

      {/* Add Marble Modal */}
      <Modal
        isOpen={isCheckInOpen}
        onClose={resetCheckInForm}
        theme={state.theme}
        title="A moment for you"
      >
        {/* Category Picker */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'block',
            marginBottom: '16px',
            color: currentTheme.text,
            opacity: 0.7
          }}>What's the win?</label>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => { 
                  setSelectedCategory(cat); 
                  setSelectedColor(cat.color); 
                  setCustomLabel(cat.label);
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '16px',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  ...(selectedCategory.id === cat.id ? buttonStyle : secondaryButtonStyle)
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
                  background: `radial-gradient(circle at 35% 35%, ${cat.color} 0%, rgba(0,0,0,0.3) 110%)`
                }} />
                <span style={{
                  fontSize: '8px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.25px'
                }}>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Label Input */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            display: 'block',
            marginBottom: '12px',
            color: currentTheme.text,
            opacity: 0.7
          }}>Label (optional)</label>
          <input 
            type="text" 
            maxLength={8}
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value.toUpperCase())}
            placeholder="E.G. HAPPY"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              outline: 'none',
              backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'white',
              border: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.3)' : 'rgba(203,213,225,1)'}`,
              color: currentTheme.text
            }}
          />
        </div>

        {/* Honoring Past Toggle */}
        <div style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px',
          borderRadius: '16px',
          backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'rgba(241,245,249,1)',
          border: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.2)' : 'rgba(203,213,225,1)'}`
        }}>
          <span style={{
            fontSize: '10px',
            fontWeight: 900,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: currentTheme.text
          }}>Adding history?</span>
          <button 
            onClick={() => setIsHonoringPast(!isHonoringPast)}
            style={{
              width: '40px',
              height: '24px',
              borderRadius: '12px',
              padding: '4px',
              border: 'none',
              cursor: 'pointer',
              backgroundColor: isHonoringPast 
                ? (state.theme === 'Midnight' ? 'rgba(99,102,241,1)' : 'rgba(30,41,59,1)') 
                : 'rgba(203,213,225,1)',
              transition: 'background-color 0.3s ease'
            }}
          >
            <div style={{
              width: '16px',
              height: '16px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'transform 0.3s ease',
              transform: isHonoringPast ? 'translateX(16px)' : 'translateX(0)'
            }} />
          </button>
        </div>

        {/* Honoring Count Slider */}
        {isHonoringPast && (
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              fontSize: '10px',
              fontWeight: 900,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              display: 'block',
              marginBottom: '12px',
              color: currentTheme.text,
              opacity: 0.7
            }}>How many?</label>
            <input 
              type="range" 
              min="1" 
              max="20" 
              value={honoringCount} 
              onChange={(e) => setHonoringCount(parseInt(e.target.value))}
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '4px',
                appearance: 'none',
                backgroundColor: 'rgba(226,232,240,1)',
                cursor: 'pointer',
                marginBottom: '8px'
              }}
            />
            <div style={{
              textAlign: 'center',
              fontWeight: 700,
              fontSize: '14px',
              color: currentTheme.text
            }}>{honoringCount} marbles</div>
          </div>
        )}

        {/* Advanced Options Toggle */}
        <button 
          onClick={() => setShowAdvanced(!showAdvanced)} 
          style={{
            fontSize: '9px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: '24px',
            display: 'block',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: currentTheme.text,
            opacity: 0.6,
            padding: 0
          }}
        >
          {showAdvanced ? "Hide advanced" : "More options"}
        </button>

        {/* Advanced Options */}
        {showAdvanced && (
          <div style={{ marginBottom: '32px' }}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: '12px',
                color: currentTheme.text,
                opacity: 0.7
              }}>Custom color</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {MARBLE_COLORS.map(color => (
                  <button 
                    key={color} 
                    onClick={() => setSelectedColor(color)} 
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      border: `2px solid ${selectedColor === color ? 'rgba(30,41,59,1)' : 'rgba(203,213,225,1)'}`,
                      backgroundColor: color,
                      cursor: 'pointer',
                      transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)',
                      transition: 'all 0.2s ease'
                    }} 
                  />
                ))}
              </div>
            </div>
            <div>
              <label style={{
                fontSize: '10px',
                fontWeight: 900,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                display: 'block',
                marginBottom: '12px',
                color: currentTheme.text,
                opacity: 0.7
              }}>Size</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['sm', 'md', 'lg'] as MarbleSize[]).map(s => (
                  <button 
                    key={s} 
                    onClick={() => setSelectedSize(s)} 
                    style={{
                      padding: '6px 16px',
                      borderRadius: '8px',
                      fontSize: '9px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      ...(selectedSize === s ? buttonStyle : secondaryButtonStyle)
                    }}
                  >{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Note Textarea */}
        <textarea 
          placeholder="Write a tiny note..."
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            height: '80px',
            padding: '16px',
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
            borderBottom: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.3)' : 'rgba(203,213,225,1)'}`,
            borderRadius: 0,
            backgroundColor: 'transparent',
            resize: 'none',
            marginBottom: '32px',
            fontSize: '14px',
            lineHeight: 1.6,
            color: currentTheme.text,
            outline: 'none'
          }}
        />
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '16px' }}>
          <button 
            onClick={resetCheckInForm} 
            style={{
              flex: 1,
              padding: '16px',
              fontSize: '12px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: currentTheme.text,
              opacity: 0.8
            }}
          >Close</button>
          <button 
            onClick={addMarble} 
            disabled={isProcessing}
            style={{
              flex: 2,
              padding: '16px',
              borderRadius: '16px',
              fontWeight: 700,
              fontSize: '12px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.1s ease',
              ...buttonStyle
            }}
            onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
            onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
          >
            Drop it in
          </button>
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        theme={state.theme}
        title="Settings"
        fullScreen
      >
        <div style={{ paddingBottom: '48px' }}>
          {/* Sound Settings */}
          <div style={{
            padding: '32px',
            borderRadius: '40px',
            marginBottom: '48px',
            backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'white',
            border: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.2)' : 'rgba(226,232,240,1)'}`,
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <VolumeIcon muted={!state.soundEnabled} />
              <h3 style={{
                fontWeight: 700,
                textTransform: 'uppercase',
                fontSize: '10px',
                letterSpacing: '0.1em',
                color: currentTheme.text
              }}>Sounds</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: 500, color: currentTheme.text }}>Drop chime</span>
              <button 
                onClick={() => setState({...state, soundEnabled: !state.soundEnabled})}
                style={{
                  width: '40px',
                  height: '24px',
                  borderRadius: '12px',
                  padding: '4px',
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: state.soundEnabled 
                    ? (state.theme === 'Midnight' ? 'rgba(99,102,241,1)' : 'rgba(30,41,59,1)') 
                    : 'rgba(203,213,225,1)',
                  transition: 'background-color 0.3s ease'
                }}
              >
                <div style={{
                  width: '16px',
                  height: '16px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: 'transform 0.3s ease',
                  transform: state.soundEnabled ? 'translateX(16px)' : 'translateX(0)'
                }} />
              </button>
            </div>
          </div>

          {/* Theme Selection */}
          <div style={{ marginBottom: '48px' }}>
            <label style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 800,
              display: 'block',
              marginBottom: '20px',
              color: currentTheme.text
            }}>Atmosphere</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {(['Classic', 'Midnight', 'Ceramic'] as JarTheme[]).map(t => (
                <button 
                  key={t} 
                  onClick={() => setState({...state, theme: t})} 
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    fontSize: '10px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: state.theme === t ? 'scale(1.05)' : 'scale(1)',
                    border: `2px solid ${state.theme === t 
                      ? (state.theme === 'Midnight' ? 'rgba(99,102,241,1)' : 'rgba(30,41,59,1)') 
                      : (state.theme === 'Midnight' ? 'rgba(99,102,241,0.2)' : 'rgba(203,213,225,1)')}`,
                    ...(state.theme === t ? buttonStyle : secondaryButtonStyle)
                  }}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Tone Selection */}
          <div>
            <label style={{
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontWeight: 800,
              display: 'block',
              marginBottom: '20px',
              color: currentTheme.text
            }}>Voice</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {(['Zen', 'Poetic', 'Grounded'] as TonePreference[]).map(t => (
                <button 
                  key={t} 
                  onClick={() => setState({...state, tone: t})} 
                  style={{
                    padding: '20px',
                    borderRadius: '16px',
                    fontSize: '10px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    transform: state.tone === t ? 'scale(1.05)' : 'scale(1)',
                    border: `2px solid ${state.tone === t 
                      ? (state.theme === 'Midnight' ? 'rgba(99,102,241,1)' : 'rgba(30,41,59,1)') 
                      : (state.theme === 'Midnight' ? 'rgba(99,102,241,0.2)' : 'rgba(203,213,225,1)')}`,
                    ...(state.tone === t ? buttonStyle : secondaryButtonStyle)
                  }}
                >{t}</button>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        theme={state.theme}
        title="What's in here"
        fullScreen
      >
        <div style={{ paddingBottom: '96px' }}>
          {state.marbles.length === 0 ? (
            <p style={{ 
              textAlign: 'center', 
              color: currentTheme.text, 
              opacity: 0.6,
              fontStyle: 'italic',
              marginTop: '48px'
            }}>
              No marbles yet. Drop your first one.
            </p>
          ) : (
            [...state.marbles].reverse().map((marble) => (
              <div 
                key={marble.id} 
                style={{
                  padding: '28px',
                  borderRadius: '40px',
                  marginBottom: '20px',
                  backdropFilter: 'blur(8px)',
                  backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.3)' : 'rgba(255,255,255,0.9)',
                  border: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.2)' : 'rgba(214,211,209,1)'}`,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start', 
                  marginBottom: '8px' 
                }}>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 900,
                    textTransform: 'uppercase',
                    letterSpacing: '0.2em',
                    color: currentTheme.text
                  }}>
                    {new Date(marble.timestamp).toLocaleDateString()}
                  </span>
                  {marble.category && (
                    <span style={{
                      fontSize: '8px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '9999px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      backgroundColor: state.theme === 'Midnight' ? 'rgba(49,46,129,0.5)' : 'rgba(241,245,249,1)',
                      color: state.theme === 'Midnight' ? 'rgba(199,210,254,1)' : 'rgba(30,41,59,1)',
                      border: `1px solid ${state.theme === 'Midnight' ? 'rgba(99,102,241,0.3)' : 'rgba(226,232,240,1)'}`
                    }}>
                      {marble.category}
                    </span>
                  )}
                </div>
                <p style={{
                  fontStyle: 'italic',
                  lineHeight: 1.6,
                  fontWeight: 600,
                  color: currentTheme.text
                }}>{marble.note || "A little win."}</p>
              </div>
            ))
          )}
        </div>
      </Modal>

      {/* Milestone Celebration */}
      {currentMilestoneMessage && (
        <EncouragementModal 
          count={state.marbles.length} 
          message={currentMilestoneMessage} 
          onClose={() => setCurrentMilestoneMessage(null)} 
          theme={state.theme}
        />
      )}
    </div>
  );
};

export default App;
