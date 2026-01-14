
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CaptureMode, CaptureResult, ScannerStatus, BoundingBox } from '../types';
import { useVision } from '../hooks/useVision';
import { Overlay } from './Overlay';

interface ScannerProps {
  mode: CaptureMode;
  onCapture: (result: CaptureResult) => void;
}

export const Scanner: React.FC<ScannerProps> = ({ mode, onCapture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [manualMode, setManualMode] = useState(false);
  const timerRef = useRef<number>(0);

  const handleCaptured = useCallback((dataUrl: string) => {
    onCapture({
      image: dataUrl,
      mode: mode,
      timestamp: Date.now()
    });
  }, [mode, onCapture]);

  const { status, progress, startCapture } = useVision({
    mode,
    videoRef,
    canvasRef,
    onCapture: handleCaptured
  });

  // 60s fallback timer
  useEffect(() => {
    setManualMode(false);
    timerRef.current = window.setTimeout(() => {
      setManualMode(true);
    }, 60000);

    return () => clearTimeout(timerRef.current);
  }, [mode]);

  return (
    <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-slate-800 shadow-2xl group">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
      />

      {/* Dynamic Overlay for detection states */}
      <Overlay status={status} progress={progress} mode={mode} />

      {/* Captured Flash Effect */}
      {status === ScannerStatus.CAPTURED && (
        <div className="absolute inset-0 bg-white z-50 animate-flash pointer-events-none"></div>
      )}

      {/* Controls Overlay */}
      <div className="absolute bottom-6 inset-x-0 flex justify-center z-20">
        {(manualMode || status === ScannerStatus.SEARCHING || status === ScannerStatus.LOCKING) && (
          <button
            onClick={startCapture}
            className="flex items-center gap-2 px-6 py-3 bg-white text-black font-bold rounded-full hover:bg-slate-100 transition-all active:scale-95 shadow-xl disabled:opacity-50"
            disabled={status === ScannerStatus.CAPTURED}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Capture Now
          </button>
        )}
      </div>

      {/* Manual Fallback Badge */}
      {manualMode && (
        <div className="absolute top-6 left-6 z-20 bg-amber-500/20 backdrop-blur-md border border-amber-500/50 text-amber-500 text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wider">
          Manual Fallback Active
        </div>
      )}
    </div>
  );
};
