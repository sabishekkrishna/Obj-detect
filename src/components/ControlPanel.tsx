import React, { useState } from 'react';
import { 
  Sliders, 
  Cpu, 
  Eye, 
  Layers, 
  Filter, 
  Check, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { 
  AVAILABLE_MODELS, 
  CATEGORY_GROUPS, 
  COCO_CLASSES,
  type DisplaySettings, 
  type DownloadProgress, 
  type ModelInfo 
} from '../types/yolo';

interface ControlPanelProps {
  selectedModel: ModelInfo;
  onSelectModel: (model: ModelInfo) => void;
  displaySettings: DisplaySettings;
  onUpdateSettings: (settings: Partial<DisplaySettings>) => void;
  device: 'webgpu' | 'wasm';
  onChangeDevice: (device: 'webgpu' | 'wasm') => void;
  downloadProgress: DownloadProgress | null;
  isModelReady: boolean;
  isLoading: boolean;
  webGpuSupported: boolean;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  selectedModel,
  onSelectModel,
  displaySettings,
  onUpdateSettings,
  device,
  onChangeDevice,
  downloadProgress,
  isModelReady,
  isLoading,
  webGpuSupported,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categories = ['All', ...Object.keys(CATEGORY_GROUPS)];

  const handleResetSettings = () => {
    onUpdateSettings({
      minConfidence: 0.25,
      iouThreshold: 0.45,
      strokeWidth: 2,
      fillOpacity: 0.15,
      showLabels: true,
      showScores: true,
      selectedCategories: []
    });
    setActiveCategory('All');
    setSearchTerm('');
  };

  const isClassActive = (cls: string) => {
    if (displaySettings.selectedCategories.length === 0) return true;
    return displaySettings.selectedCategories.includes(cls);
  };

  const toggleClass = (cls: string) => {
    if (displaySettings.selectedCategories.includes(cls)) {
      onUpdateSettings({
        selectedCategories: displaySettings.selectedCategories.filter(c => c !== cls)
      });
    } else {
      onUpdateSettings({
        selectedCategories: [...displaySettings.selectedCategories, cls]
      });
    }
  };

  const selectCategoryGroup = (cat: string) => {
    setActiveCategory(cat);
    if (cat === 'All') {
      onUpdateSettings({ selectedCategories: [] });
    } else {
      const classesInGroup = CATEGORY_GROUPS[cat] || [];
      onUpdateSettings({ selectedCategories: classesInGroup });
    }
  };

  const filteredClasses = COCO_CLASSES.filter(c => {
    const matchesSearch = c.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeCategory === 'All') return matchesSearch;
    const inGroup = CATEGORY_GROUPS[activeCategory]?.includes(c);
    return matchesSearch && inGroup;
  });

  return (
    <div className="flex flex-col gap-5 bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 text-slate-200">
      {/* Header with Title and Reset */}
      <div className="flex items-center justify-between border-b border-slate-800/70 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">Inference Controls</h2>
        </div>
        <button
          onClick={handleResetSettings}
          title="Reset to defaults"
          className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>

      {/* Model Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
          <span>YOLO Architecture</span>
          <span className="text-[11px] text-cyan-400/90 font-mono">{selectedModel.architecture}</span>
        </label>
        <div className="grid grid-cols-1 gap-1.5">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => onSelectModel(model)}
              disabled={isLoading}
              className={`flex items-start justify-between p-2.5 rounded-lg border text-left transition-all ${
                selectedModel.id === model.id
                  ? 'bg-cyan-950/40 border-cyan-500/50 text-white'
                  : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">{model.name}</span>
                  {model.recommended && (
                    <span className="text-[10px] text-cyan-300 font-medium bg-cyan-900/60 px-1.5 py-0.5 rounded">
                      Fastest
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{model.description}</p>
              </div>
              <div className="text-right shrink-0 ml-2">
                <span className="text-[11px] font-mono tabular-nums text-slate-400">{model.sizeMb} MB</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Model Loading Status */}
      {downloadProgress && downloadProgress.status === 'progress' && (
        <div className="bg-slate-950/80 border border-cyan-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-cyan-300 mb-1.5">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Caching model weights locally...</span>
            </span>
            <span className="font-mono tabular-nums">{downloadProgress.progress || 0}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-cyan-400 h-full transition-all duration-200"
              style={{ width: `${downloadProgress.progress || 0}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 font-mono truncate">
            {downloadProgress.file || 'Downloading ONNX weights into browser storage'}
          </p>
        </div>
      )}

      {/* Hardware Execution Engine (WebAssembly vs WebGPU) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Execution Runtime</span>
          </span>
          <span className="text-[11px] text-slate-400">100% Local</span>
        </label>
        <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-1 rounded-lg border border-slate-800/80">
          <button
            onClick={() => onChangeDevice('wasm')}
            className={`py-1.5 px-3 text-xs font-medium rounded-md transition-all ${
              device === 'wasm'
                ? 'bg-slate-800 text-cyan-300 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            WebAssembly SIMD
          </button>
          <button
            onClick={() => onChangeDevice('webgpu')}
            disabled={!webGpuSupported}
            title={!webGpuSupported ? 'WebGPU is not enabled in this browser' : 'Use GPU acceleration'}
            className={`py-1.5 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-1 ${
              device === 'webgpu'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : webGpuSupported
                ? 'text-slate-400 hover:text-slate-200'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <span>WebGPU</span>
            {webGpuSupported && <span className="text-[9px] text-cyan-400 font-mono">ACCEL</span>}
          </button>
        </div>
      </div>

      {/* Confidence & IoU Sliders */}
      <div className="flex flex-col gap-3 pt-2 border-t border-slate-800/60">
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-300 font-medium">Confidence Threshold</span>
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {Math.round(displaySettings.minConfidence * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.05"
            max="0.95"
            step="0.05"
            value={displaySettings.minConfidence}
            onChange={(e) => onUpdateSettings({ minConfidence: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>5% (High Recall)</span>
            <span>95% (High Precision)</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-300 font-medium">IoU / NMS Overlap Threshold</span>
            <span className="font-mono text-cyan-400 font-semibold tabular-nums">
              {Math.round(displaySettings.iouThreshold * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.10"
            max="0.90"
            step="0.05"
            value={displaySettings.iouThreshold}
            onChange={(e) => onUpdateSettings({ iouThreshold: parseFloat(e.target.value) })}
            className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
        </div>
      </div>

      {/* Visual Display Toggles */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
        <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>HUD Visual Overlay</span>
        </label>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={displaySettings.showLabels}
              onChange={(e) => onUpdateSettings({ showLabels: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
            <span className="text-slate-300 text-[11px]">Class Labels</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer bg-slate-950/40 p-2 rounded-lg border border-slate-800 hover:border-slate-700">
            <input
              type="checkbox"
              checked={displaySettings.showScores}
              onChange={(e) => onUpdateSettings({ showScores: e.target.checked })}
              className="accent-cyan-400 rounded"
            />
            <span className="text-slate-300 text-[11px]">Confidence %</span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-1">
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Border Stroke</span>
              <span className="font-mono tabular-nums">{displaySettings.strokeWidth}px</span>
            </div>
            <input
              type="range"
              min="1"
              max="5"
              step="1"
              value={displaySettings.strokeWidth}
              onChange={(e) => onUpdateSettings({ strokeWidth: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none"
            />
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-slate-400 mb-1">
              <span>Box Tint</span>
              <span className="font-mono tabular-nums">{Math.round(displaySettings.fillOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.4"
              step="0.05"
              value={displaySettings.fillOpacity}
              onChange={(e) => onUpdateSettings({ fillOpacity: parseFloat(e.target.value) })}
              className="w-full accent-cyan-400 h-1 bg-slate-800 rounded appearance-none"
            />
          </div>
        </div>
      </div>

      {/* COCO Class Filtering */}
      <div className="flex flex-col gap-2 pt-2 border-t border-slate-800/60">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Class Filter (80 COCO)</span>
          </label>
          {displaySettings.selectedCategories.length > 0 && (
            <button
              onClick={() => onUpdateSettings({ selectedCategories: [] })}
              className="text-[10px] text-cyan-400 hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Category Pills / Buttons */}
        <div className="flex flex-wrap gap-1">
          {categories.slice(0, 6).map(cat => (
            <button
              key={cat}
              onClick={() => selectCategoryGroup(cat)}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                activeCategory === cat
                  ? 'bg-cyan-500 text-slate-950 font-semibold'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Search input for specific classes */}
        <input
          type="text"
          placeholder="Filter classes (e.g. person, car, dog)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
        />

        {/* Filter tags */}
        <div className="max-h-24 overflow-y-auto pr-1 flex flex-wrap gap-1 text-[10px]">
          {filteredClasses.slice(0, 16).map(cls => {
            const active = isClassActive(cls);
            return (
              <button
                key={cls}
                onClick={() => toggleClass(cls)}
                className={`px-1.5 py-0.5 rounded border transition-colors flex items-center gap-1 ${
                  active
                    ? 'bg-slate-800 border-slate-600 text-slate-200'
                    : 'bg-slate-950/40 border-slate-900 text-slate-600 hover:text-slate-400'
                }`}
              >
                {active && <Check className="w-2.5 h-2.5 text-cyan-400" />}
                <span>{cls}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
