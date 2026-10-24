import React from 'react';
import { Download } from 'lucide-react';

interface TopBarProps {
  activeTab: 'studio' | 'webcam' | 'architecture' | 'batch';
  setActiveTab: (tab: 'studio' | 'webcam' | 'architecture' | 'batch') => void;
  onOpenExport: () => void;
  detectionsCount: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenExport,
  detectionsCount,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
      {/* Zone 1: Single text element wordmark */}
      <a 
        href="#studio" 
        onClick={(e) => { e.preventDefault(); setActiveTab('studio'); }}
        className="text-lg font-bold tracking-tight text-white whitespace-nowrap shrink-0 flex items-center gap-2 hover:text-cyan-400 transition-colors"
      >
        <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400 inline-block rotate-45" />
        <span>Local YOLO Studio</span>
      </a>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => setActiveTab('studio')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'studio' ? 'text-white border-b-2 border-cyan-400 font-semibold' : ''
          }`}
        >
          Detection Studio
        </button>
        <button
          onClick={() => setActiveTab('webcam')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'webcam' ? 'text-white border-b-2 border-cyan-400 font-semibold' : ''
          }`}
        >
          Realtime Webcam
        </button>
        <button
          onClick={() => setActiveTab('batch')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'batch' ? 'text-white border-b-2 border-cyan-400 font-semibold' : ''
          }`}
        >
          Batch Queue
        </button>
        <button
          onClick={() => setActiveTab('architecture')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'architecture' ? 'text-white border-b-2 border-cyan-400 font-semibold' : ''
          }`}
        >
          YOLO Architecture
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenExport}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold text-slate-900 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-sm shadow-cyan-500/20 active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Annotations</span>
          {detectionsCount > 0 && (
            <span className="font-mono text-[11px] px-1.5 py-0.2 bg-slate-950/20 rounded">
              {detectionsCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
