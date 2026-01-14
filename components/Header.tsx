
import React from 'react';
import { CaptureMode } from '../types';

interface HeaderProps {
  mode: CaptureMode;
  onModeSwitch: (mode: CaptureMode) => void;
}

export const Header: React.FC<HeaderProps> = ({ mode, onModeSwitch }) => {
  return (
    <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 px-4 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-none">VisionStack</h1>
            <span className="text-[10px] uppercase tracking-widest text-indigo-400 font-bold">Pro Capture Engine</span>
          </div>
        </div>

        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => onModeSwitch('FACE')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'FACE' 
              ? 'bg-slate-800 text-white shadow-lg' 
              : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Face Mode
          </button>
          <button
            onClick={() => onModeSwitch('ID_CARD')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'ID_CARD' 
              ? 'bg-slate-800 text-white shadow-lg' 
              : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ID Card Mode
          </button>
        </div>
      </div>
    </header>
  );
};
