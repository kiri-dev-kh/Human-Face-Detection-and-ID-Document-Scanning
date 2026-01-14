
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { Scanner } from './components/Scanner';
import { CaptureMode, CaptureResult } from './types';
import { PhotoGallery } from './components/PhotoGallery';

const App: React.FC = () => {
  const [mode, setMode] = useState<CaptureMode>('FACE');
  const [captures, setCaptures] = useState<CaptureResult[]>([]);
  const [cvReady, setCvReady] = useState(false);

  useEffect(() => {
    // Check if OpenCV is ready
    const checkCV = () => {
      // Use any cast to access global cv object safely to avoid TypeScript errors
      const win = window as any;
      if (win.cv && win.cv.onRuntimeInitialized) {
         win.cv.onRuntimeInitialized = () => setCvReady(true);
      } else if (win.cv) {
         setCvReady(true);
      } else {
        setTimeout(checkCV, 100);
      }
    };
    checkCV();
  }, []);

  const handleCapture = useCallback((result: CaptureResult) => {
    setCaptures(prev => [result, ...prev]);
  }, []);

  const handleModeSwitch = (newMode: CaptureMode) => {
    setMode(newMode);
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 font-sans selection:bg-indigo-500 selection:text-white">
      <Header mode={mode} onModeSwitch={handleModeSwitch} />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 flex flex-col gap-6">
          {!cvReady ? (
            <div className="bg-slate-900 aspect-video rounded-3xl flex items-center justify-center border border-slate-800 animate-pulse">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Initializing Engine (OpenCV.js)...</p>
              </div>
            </div>
          ) : (
            <Scanner mode={mode} onCapture={handleCapture} />
          )}

          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              Engineering Guide
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <strong className="text-slate-200 block mb-1">Steady-State Logic</strong>
                The system monitors bounding box variance. Once standard deviation drops below 2% for 800ms, auto-capture triggers.
              </div>
              <div className="p-3 bg-slate-950/50 rounded-xl border border-slate-800">
                <strong className="text-slate-200 block mb-1">Perspective Warp</strong>
                ID Card mode uses OpenCV.js to detect the largest rectangular contour and applies a top-down warp transform.
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4">
          <PhotoGallery captures={captures} />
        </aside>
      </main>

      <footer className="py-6 border-t border-slate-900 text-center text-slate-500 text-sm">
        <p>&copy; {new Date().getFullYear()} Vision Engine Core. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
