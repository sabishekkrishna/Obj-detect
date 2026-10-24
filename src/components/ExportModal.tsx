import React, { useState } from 'react';
import { 
  Download, 
  X, 
  Copy, 
  Check, 
  FileText, 
  Image as ImageIcon,
  Code
} from 'lucide-react';
import type { Detection } from '../types/yolo';
import { 
  exportYOLOFormat, 
  exportCOCOFormat, 
  exportCSVFormat, 
  downloadCanvasImage 
} from '../utils/exportUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  detections: Detection[];
  canvasElement: HTMLCanvasElement | null;
  imageWidth: number;
  imageHeight: number;
  imageName: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  detections,
  canvasElement,
  imageWidth,
  imageHeight,
  imageName,
}) => {
  const [activeFormat, setActiveFormat] = useState<'yolo' | 'coco' | 'csv' | 'image'>('yolo');
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  // Generate preview text based on active format
  const getYoloPreview = () => {
    return detections.map(d => {
      const { xCenter, yCenter, width, height } = d.normalizedBox;
      return `${d.classId} ${xCenter} ${yCenter} ${width} ${height}  # ${d.label} (${(d.score * 100).toFixed(0)}%)`;
    }).join('\n');
  };

  const getCocoPreview = () => {
    const previewObj = {
      image: { name: imageName, width: imageWidth, height: imageHeight },
      detections_count: detections.length,
      sample_annotations: detections.slice(0, 3).map((d, i) => ({
        id: i + 1,
        category: d.label,
        bbox: [d.box.xmin, d.box.ymin, d.box.xmax - d.box.xmin, d.box.ymax - d.box.ymin],
        score: d.score
      }))
    };
    return JSON.stringify(previewObj, null, 2);
  };

  const getCsvPreview = () => {
    const headers = 'class_id,label,confidence,xmin,ymin,xmax,ymax,occupancy';
    const rows = detections.slice(0, 5).map(d => 
      `${d.classId},"${d.label}",${d.score},${d.box.xmin},${d.box.ymin},${d.box.xmax},${d.box.ymax},${d.areaPercent}%`
    );
    return [headers, ...rows].join('\n');
  };

  const handleCopy = () => {
    let content = '';
    if (activeFormat === 'yolo') content = getYoloPreview();
    else if (activeFormat === 'coco') content = getCocoPreview();
    else if (activeFormat === 'csv') content = getCsvPreview();

    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const baseName = imageName.replace(/\.[^/.]+$/, '');
    if (activeFormat === 'yolo') {
      exportYOLOFormat(detections, `${baseName}_yolo.txt`);
    } else if (activeFormat === 'coco') {
      exportCOCOFormat(detections, imageWidth, imageHeight, imageName, `${baseName}_coco.json`);
    } else if (activeFormat === 'csv') {
      exportCSVFormat(detections, `${baseName}_detections.csv`);
    } else if (activeFormat === 'image' && canvasElement) {
      downloadCanvasImage(canvasElement, `${baseName}_annotated.png`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">Export Annotations & Dataset</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Export {detections.length} detected instances in standard machine learning formats
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex items-center gap-1 px-6 pt-4 border-b border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => setActiveFormat('yolo')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeFormat === 'yolo'
                ? 'bg-slate-900 text-cyan-400 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>YOLO Format (.txt)</span>
          </button>
          <button
            onClick={() => setActiveFormat('coco')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeFormat === 'coco'
                ? 'bg-slate-900 text-cyan-400 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>COCO JSON (.json)</span>
          </button>
          <button
            onClick={() => setActiveFormat('csv')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeFormat === 'csv'
                ? 'bg-slate-900 text-cyan-400 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>CSV Table (.csv)</span>
          </button>
          <button
            onClick={() => setActiveFormat('image')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 ${
              activeFormat === 'image'
                ? 'bg-slate-900 text-cyan-400 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200 border-transparent'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            <span>Annotated Image (.png)</span>
          </button>
        </div>

        {/* Modal Body with Preview */}
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>
              {activeFormat === 'yolo' && 'Darknet / Ultralytics normalized bounding box schema'}
              {activeFormat === 'coco' && 'MS COCO Object Detection 2017 specification'}
              {activeFormat === 'csv' && 'Tabular pixel coordinates and metadata'}
              {activeFormat === 'image' && 'Full resolution canvas snapshot with high-contrast HUD boxes'}
            </span>
            {activeFormat !== 'image' && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy to Clipboard'}</span>
              </button>
            )}
          </div>

          {activeFormat !== 'image' ? (
            <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 font-mono text-xs text-slate-300 max-h-56 overflow-y-auto whitespace-pre">
              {activeFormat === 'yolo' && getYoloPreview()}
              {activeFormat === 'coco' && getCocoPreview()}
              {activeFormat === 'csv' && getCsvPreview()}
            </div>
          ) : (
            <div className="bg-slate-950 rounded-lg p-6 border border-slate-800 flex flex-col items-center justify-center text-center">
              <ImageIcon className="w-12 h-12 text-cyan-400 mb-2" />
              <p className="text-sm font-semibold text-white">Save High-Resolution Overlay Image</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Generates a lossless PNG with all active bounding boxes, class labels, and confidence tags.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/60 border-t border-slate-800">
          <span className="text-xs text-slate-500 font-mono">
            {detections.length} objects · {imageWidth}×{imageHeight}px
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs rounded-lg shadow-sm shadow-cyan-500/20 transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
