import React, { useState, useRef } from 'react';
import { 
  Upload, 
  Play, 
  Trash2, 
  CheckCircle, 
  Download, 
  Layers, 
  Clock, 
  Scan,
  Sparkles
} from 'lucide-react';
import { yoloService } from '../services/yoloService';
import type { Detection, DisplaySettings, InferenceStats } from '../types/yolo';
import { exportYOLOFormat, exportCOCOFormat, exportCSVFormat } from '../utils/exportUtils';

export interface BatchItem {
  id: string;
  name: string;
  url: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  detections: Detection[];
  stats?: InferenceStats;
}

interface BatchQueueProps {
  initialSamples: { name: string; url: string }[];
  displaySettings: DisplaySettings;
  onInspectItem: (item: BatchItem) => void;
}

export const BatchQueue: React.FC<BatchQueueProps> = ({
  initialSamples,
  displaySettings,
  onInspectItem,
}) => {
  const [items, setItems] = useState<BatchItem[]>(() => 
    initialSamples.map((s, idx) => ({
      id: `batch_sample_${idx}`,
      name: s.name,
      url: s.url,
      status: 'pending',
      detections: []
    }))
  );

  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchItem[] = Array.from(files).map((file, idx) => ({
      id: `batch_user_${Date.now()}_${idx}`,
      name: file.name,
      url: URL.createObjectURL(file),
      status: 'pending',
      detections: []
    }));

    setItems(prev => [...prev, ...newItems]);
  };

  const handleClear = () => {
    if (isRunning) return;
    setItems([]);
    setCurrentIndex(-1);
  };

  const runBatchInference = async () => {
    if (isRunning || items.length === 0) return;
    setIsRunning(true);

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      setItems(prev => prev.map((item, idx) => 
        idx === i ? { ...item, status: 'processing' } : item
      ));

      try {
        const item = items[i];
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = item.url;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const res = await yoloService.detect(
          img,
          displaySettings.minConfidence,
          img.naturalWidth,
          img.naturalHeight
        );

        setItems(prev => prev.map((it, idx) => 
          idx === i ? {
            ...it,
            status: 'done',
            detections: res.detections,
            stats: res.stats
          } : it
        ));
      } catch (err) {
        console.warn(`Error processing item ${i}:`, err);
        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'error' } : it
        ));
      }
    }

    setIsRunning(false);
    setCurrentIndex(-1);
  };

  const completedItems = items.filter(i => i.status === 'done');
  const totalDetections = completedItems.reduce((acc, i) => acc + i.detections.length, 0);
  const totalTime = completedItems.reduce((acc, i) => acc + (i.stats?.totalTimeMs || 0), 0);
  const avgTime = completedItems.length > 0 ? Math.round(totalTime / completedItems.length) : 0;

  const exportAllDetections = () => {
    const allDetections: Detection[] = [];
    completedItems.forEach(item => {
      allDetections.push(...item.detections);
    });
    exportCSVFormat(allDetections, 'batch_all_yolo_detections.csv');
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto py-2 text-slate-200">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Batch Processing & Evaluation Queue</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Run local YOLO object detection across multiple files sequentially with batch statistics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-medium rounded-lg text-slate-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Add Images</span>
          </button>

          <button
            onClick={runBatchInference}
            disabled={isRunning || items.length === 0}
            className="flex items-center gap-2 px-4 py-1.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-lg transition-colors shadow-sm shadow-cyan-500/20 active:scale-95"
          >
            {isRunning ? (
              <>
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>Processing Item #{currentIndex + 1}...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run Batch YOLO</span>
              </>
            )}
          </button>

          {completedItems.length > 0 && (
            <button
              onClick={exportAllDetections}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={handleClear}
            disabled={isRunning}
            title="Clear Queue"
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-rose-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Aggregate Batch Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Queue Items</span>
          <span className="text-xl font-bold text-white font-mono tabular-nums">
            {completedItems.length} / {items.length}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Total Detections</span>
          <span className="text-xl font-bold text-cyan-400 font-mono tabular-nums">
            {totalDetections}
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Avg Time per Image</span>
          <span className="text-xl font-bold text-emerald-400 font-mono tabular-nums">
            {avgTime} ms
          </span>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5">
          <span className="text-[11px] text-slate-400 block">Effective Speed</span>
          <span className="text-xl font-bold text-amber-400 font-mono tabular-nums">
            {avgTime > 0 ? (1000 / avgTime).toFixed(1) : 0} FPS
          </span>
        </div>
      </div>

      {/* Batch Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {items.map((item, idx) => (
          <div
            key={item.id}
            className={`bg-slate-900/70 border rounded-xl p-4 flex gap-4 transition-all ${
              currentIndex === idx
                ? 'border-cyan-400 ring-1 ring-cyan-400/30'
                : 'border-slate-800/80 hover:border-slate-700'
            }`}
          >
            <div className="w-28 h-20 bg-slate-950 rounded-lg overflow-hidden shrink-0 border border-slate-800 relative">
              <img
                src={item.url}
                alt={item.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              {item.status === 'done' && (
                <span className="absolute bottom-1 right-1 bg-slate-950/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-mono text-cyan-300 border border-slate-700">
                  {item.detections.length} objs
                </span>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-between min-w-0">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white truncate max-w-[160px]">
                    {item.name}
                  </span>
                  <span className="text-[10px] font-mono">
                    {item.status === 'pending' && <span className="text-slate-500">Queued</span>}
                    {item.status === 'processing' && (
                      <span className="text-cyan-400 flex items-center gap-1 font-semibold">
                        <Sparkles className="w-3 h-3 animate-spin" />
                        Running...
                      </span>
                    )}
                    {item.status === 'done' && (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Complete
                      </span>
                    )}
                    {item.status === 'error' && <span className="text-rose-400">Failed</span>}
                  </span>
                </div>

                {item.status === 'done' ? (
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {item.stats?.totalTimeMs}ms · {item.detections.length} objects detected
                  </p>
                ) : (
                  <p className="text-[11px] text-slate-500 mt-1">Ready for inference</p>
                )}
              </div>

              {item.status === 'done' && (
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => onInspectItem(item)}
                    className="text-[11px] text-cyan-400 hover:text-cyan-300 font-medium hover:underline flex items-center gap-1"
                  >
                    <Scan className="w-3 h-3" />
                    <span>Open in Studio</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
