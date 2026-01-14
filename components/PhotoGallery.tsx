
import React from 'react';
import { CaptureResult } from '../types';

interface PhotoGalleryProps {
  captures: CaptureResult[];
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({ captures }) => {
  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden flex flex-col h-full max-h-[700px]">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between">
        <h3 className="font-bold">Captured Data</h3>
        <span className="bg-indigo-500/20 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 uppercase">
          {captures.length} Total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {captures.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm">No captures yet</p>
          </div>
        ) : (
          captures.map((cap) => (
            <div key={cap.timestamp} className="bg-slate-950 rounded-2xl border border-slate-800 p-2 overflow-hidden hover:border-indigo-500/50 transition-colors group">
              <div className="relative aspect-square md:aspect-video rounded-xl overflow-hidden mb-2">
                <img src={cap.image} alt="Capture" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-bold text-white uppercase border border-white/20">
                  {cap.mode === 'FACE' ? 'Human Face' : 'ID Document'}
                </div>
              </div>
              <div className="px-2 pb-1 flex justify-between items-center">
                <span className="text-[10px] text-slate-500">
                  {new Date(cap.timestamp).toLocaleTimeString()}
                </span>
                <button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = cap.image;
                    link.download = `capture-${cap.timestamp}.png`;
                    link.click();
                  }}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase"
                >
                  Download
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
