import React from 'react';

interface EncouragementModalProps {
  message: string;
  count: number;
  onClose: () => void;
  themeBg?: string;
  themeText?: string;
  isDark?: boolean;
}

const EncouragementModal: React.FC<EncouragementModalProps> = ({ 
  message, 
  count, 
  onClose, 
  themeBg = '#fdfaf6', 
  themeText = 'text-slate-800',
  isDark = false 
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/30 backdrop-blur-sm transition-all">
      <div 
        className="rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl transform scale-100 animate-in fade-in zoom-in duration-300 border transition-colors duration-500"
        style={{ backgroundColor: themeBg, borderColor: isDark ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255, 255, 255, 0.5)' }}
      >
        <div className="text-center">
          <div className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-bold tracking-widest uppercase mb-6 border ${isDark ? 'bg-indigo-900/50 text-indigo-200 border-indigo-500/30' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
            {count} gathered
          </div>
          <h2 className={`text-2xl font-bold mb-6 serif leading-tight ${themeText}`}>{message}</h2>
          <button
            onClick={onClose}
            className={`w-full mt-4 py-4 px-6 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all shadow-xl active:scale-95 ${isDark ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-slate-800 hover:bg-slate-900'}`}
          >
            I'll take that.
          </button>
        </div>
      </div>
    </div>
  );
};

export default EncouragementModal;