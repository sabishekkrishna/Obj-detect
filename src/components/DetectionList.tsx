import React, { useState } from 'react';
import { 
  Crosshair, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  Maximize2,
  Tag
} from 'lucide-react';
import type { Detection } from '../types/yolo';
import { cropAndDownloadDetection } from '../utils/exportUtils';

interface DetectionListProps {
  detections: Detection[];
  hoveredDetectionId: string | null;
  selectedDetection: Detection | null;
  onHoverDetection: (id: string | null) => void;
  onSelectDetection: (detection: Detection | null) => void;
  canvasElement: HTMLCanvasElement | null;
}

export const DetectionList: React.FC<DetectionListProps> = ({
  detections,
  hoveredDetectionId,
  selectedDetection,
  onHoverDetection,
  onSelectDetection,
  canvasElement,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyYoloFormat = (d: Detection) => {
    const { xCenter, yCenter, width, height } = d.normalizedBox;
    const text = `${d.classId} ${xCenter} ${yCenter} ${width} ${height}`;
    navigator.clipboard.writeText(text);
    setCopiedId(d.id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleDownloadCrop = (d: Detection) => {
    if (canvasElement) {
      cropAndDownloadDetection(canvasElement, d);
    }
  };

  const uniqueClasses = Array.from(new Set(detections.map(d => d.label)));
  const avgConfidence = detections.length > 0
    ? Math.round((detections.reduce((acc, d) => acc + d.score, 0) / detections.length) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-4 bg-slate-900/70 border border-slate-800/80 rounded-xl p-5 text-slate-200">
      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 border-b border-slate-800/70 pb-4">
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-[11px] text-slate-400 block">Detections</span>
          <span className="text-lg font-bold text-white font-mono tabular-nums">
            {detections.length}
          </span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-[11px] text-slate-400 block">Unique Classes</span>
          <span className="text-lg font-bold text-cyan-400 font-mono tabular-nums">
            {uniqueClasses.length}
          </span>
        </div>
        <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/60">
          <span className="text-[11px] text-slate-400 block">Avg Confidence</span>
          <span className="text-lg font-bold text-emerald-400 font-mono tabular-nums">
            {avgConfidence}%
          </span>
        </div>
      </div>

      {/* Selected Object Inspection Modal / Card */}
      {selectedDetection && (
        <div className="bg-cyan-950/20 border border-cyan-500/40 rounded-xl p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: selectedDetection.color }}
              />
              <span className="text-sm font-bold text-white capitalize">
                {selectedDetection.label}
              </span>
              <span className="text-xs font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                {(selectedDetection.score * 100).toFixed(1)}% confidence
              </span>
            </div>
            <button
              onClick={() => onSelectDetection(null)}
              className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5"
            >
              ✕
            </button>
          </div>

          {/* Coordinate inspection */}
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
            <div>
              <span className="text-slate-400 block text-[10px]">Pixel Box (X1, Y1, X2, Y2)</span>
              <span className="text-slate-200 tabular-nums">
                [{selectedDetection.box.xmin}, {selectedDetection.box.ymin}, {selectedDetection.box.xmax}, {selectedDetection.box.ymax}]
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Normalized YOLO Format</span>
              <span className="text-slate-200 tabular-nums">
                [{selectedDetection.normalizedBox.xCenter}, {selectedDetection.normalizedBox.yCenter}, {selectedDetection.normalizedBox.width}, {selectedDetection.normalizedBox.height}]
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Box Dimensions</span>
              <span className="text-slate-200 tabular-nums">
                {selectedDetection.box.xmax - selectedDetection.box.xmin}px × {selectedDetection.box.ymax - selectedDetection.box.ymin}px
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">Frame Occupancy</span>
              <span className="text-slate-200 tabular-nums">
                {selectedDetection.areaPercent}% of frame
              </span>
            </div>
          </div>

          {/* Action buttons for selected item */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopyYoloFormat(selectedDetection)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition-colors"
            >
              {copiedId === selectedDetection.id ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied YOLO String!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy YOLO String</span>
                </>
              )}
            </button>
            <button
              onClick={() => handleDownloadCrop(selectedDetection)}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-medium rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Crop Object</span>
            </button>
          </div>
        </div>
      )}

      {/* Detections Table / List */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <span className="font-semibold text-slate-300">Detected Instances</span>
          <span className="text-[11px]">Click to inspect / crop</span>
        </div>

        {detections.length === 0 ? (
          <div className="text-center py-10 bg-slate-950/40 rounded-lg border border-slate-800/60">
            <Crosshair className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No objects detected above threshold</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Try lowering the confidence threshold or selecting another test scene
            </p>
          </div>
        ) : (
          <div className="max-h-[360px] overflow-y-auto pr-1 flex flex-col gap-1.5">
            {detections.map((d, index) => {
              const isHovered = hoveredDetectionId === d.id;
              const isSelected = selectedDetection?.id === d.id;

              return (
                <div
                  key={d.id}
                  onMouseEnter={() => onHoverDetection(d.id)}
                  onMouseLeave={() => onHoverDetection(null)}
                  onClick={() => onSelectDetection(d)}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/50 border-cyan-500/60 text-white shadow-sm'
                      : isHovered
                      ? 'bg-slate-800/80 border-slate-700 text-white'
                      : 'bg-slate-950/50 border-slate-800/80 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 w-4">
                      #{index + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: d.color }}
                    />
                    <div className="truncate">
                      <span className="text-xs font-semibold capitalize text-slate-100 block truncate">
                        {d.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {d.box.xmax - d.box.xmin}×{d.box.ymax - d.box.ymin}px · {d.areaPercent}% area
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold font-mono text-cyan-400 tabular-nums">
                        {(d.score * 100).toFixed(0)}%
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyYoloFormat(d);
                      }}
                      title="Copy YOLO coordinates"
                      className="p-1 hover:bg-slate-700/60 rounded text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {copiedId === d.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
