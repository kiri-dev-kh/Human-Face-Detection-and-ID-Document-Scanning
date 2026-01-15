
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
      case ScannerStatus.ERROR: return 'Camera Error / Not Found';
      default: return '';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case ScannerStatus.LOCKING: return 'text-yellow-400';
      case ScannerStatus.CAPTURED: return 'text-green-400';
      case ScannerStatus.ERROR: return 'text-red-500';
      default: return 'text-white';
    }
  };

  return (
    <div className="absolute inset-0 z-20 pointer-events-none">
      {status === ScannerStatus.ERROR && (
        <div className="absolute inset-0 bg-slate-950/80 flex items-center justify-center p-8 text-center pointer-events-auto">
          <div>
            <div className="bg-red-500/20 text-red-500 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Camera Access Blocked</h3>
            <p className="text-slate-400 max-w-xs mx-auto">Please ensure camera permissions are granted and no other app is using the camera.</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-500 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Corner Brackets UI */}
      <div className={`absolute inset-0 m-12 md:m-24 border-2 transition-all duration-500 ${
        status === ScannerStatus.LOCKING 
        ? 'border-yellow-400 scale-105' 
        : status === ScannerStatus.CAPTURED
        ? 'border-green-400 scale-95 opacity-0'
        : status === ScannerStatus.ERROR
        ? 'opacity-0'
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
