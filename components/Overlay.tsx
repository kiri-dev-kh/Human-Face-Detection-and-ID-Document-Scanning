
import React from 'react';
import { ScannerStatus, CaptureMode } from '../types';

interface OverlayProps {
  status: ScannerStatus;
  progress: number;
  mode: CaptureMode;
}

export const Overlay: React.FC<OverlayProps> = ({ status, progress, mode }) => {
  const getStatusText = () => {
    switch (status) {
      case ScannerStatus.INITIALIZING: return 'Loading AI Models...';
      case ScannerStatus.SEARCHING: return `Finding ${mode === 'FACE' ? 'Face' : 'ID Card'}...`;
      case ScannerStatus.LOCKING: return 'Hold Steady...';
      case ScannerStatus.CAPTURED: return 'Captured!';
      case ScannerStatus.ERROR: return 'Scanner Error';
      default: return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case ScannerStatus.LOCKING: return 'text-yellow-400';
      case ScannerStatus.CAPTURED: return 'text-green-400';
      default: return 'text-white';
    }
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {/* Corner Brackets UI */}
      <div className={`absolute inset-0 m-12 md:m-24 border-2 transition-all duration-500 ${
        status === ScannerStatus.LOCKING 
        ? 'border-yellow-400 scale-105' 
        : status === ScannerStatus.CAPTURED
        ? 'border-green-400 scale-95 opacity-0'
        : 'border-white/30 border-dashed'
      } rounded-[2rem]`}>
        {/* Animated Scanning Line */}
        {status === ScannerStatus.SEARCHING && (
          <div className="absolute top-0 left-0 right-0 h-1 bg-white/20 animate-scan rounded-full"></div>
        )}
      </div>

      {/* Bottom Status Text */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <div className="text-right">
          <p className={`text-xs font-bold uppercase tracking-widest ${getStatusColor()}`}>
            {getStatusText()}
          </p>
          {status === ScannerStatus.LOCKING && (
            <div className="mt-1 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
              <div 
                className="bg-yellow-400 h-full transition-all duration-100 ease-linear"
                style={{ width: `${progress * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
