import React, { useState } from 'react';
import { 
  Cpu, 
  Layers, 
  Maximize2, 
  Zap, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2,
  Box,
  Compass
} from 'lucide-react';

export const ArchitectureGuide: React.FC = () => {
  const [selectedStage, setSelectedStage] = useState<number>(0);

  const stages = [
    {
      title: '01. Input Letterboxing',
      subtitle: 'Aspect ratio preservation & normalization',
      description: 'The raw frame (e.g. 1920×1080) is dynamically padded and resized into a standardized 640×640 tensor without aspect ratio distortion. Pixel RGB values [0, 255] are normalized to floats [0.0, 1.0].',
      badge: 'Preprocessing',
      details: ['Square stride-32 padding', 'RGB channel normalization', 'Zero aspect distortion']
    },
    {
      title: '02. CSPDarknet Backbone',
      subtitle: 'Multi-scale spatial feature extraction',
      description: 'Cross-Stage Partial network extracts low-level edges, mid-level textures, and high-level semantic shapes while maintaining high memory bandwidth efficiency for edge/browser inference.',
      badge: 'Backbone',
      details: ['Strided convolutions', 'Residual bottleneck connections', 'Multi-receptive field depth']
    },
    {
      title: '03. PANet Neck & Pyramid',
      subtitle: 'Bidirectional feature fusion',
      description: 'Combines semantic features from top-down pathways with precise spatial localizations from bottom-up pathways. Outputs feature maps at 3 distinct resolutions: P3 (80×80), P4 (40×40), and P5 (20×20).',
      badge: 'Feature Pyramid',
      details: ['P3 (Small objects like keys, bottles)', 'P4 (Medium objects like laptops, dogs)', 'P5 (Large objects like cars, buses)']
    },
    {
      title: '04. Decoupled Detection Head',
      subtitle: 'Independent classification and bounding box regression',
      description: 'Unlike older detectors that entangled class probability with coordinate regression, modern YOLO separates bounding box offset estimation (DFL - Distribution Focal Loss) from COCO class scoring.',
      badge: 'Head',
      details: ['Anchor-free center point prediction', '80 COCO category probabilities', 'Direct coordinate regressors']
    },
    {
      title: '05. End-to-End NMS-Free Head',
      subtitle: 'Zero latency non-maximum suppression',
      description: 'YOLOv10 introduces dual label assignment (one-to-many for training, one-to-one for inference). This eliminates the CPU bottleneck of classical Non-Maximum Suppression (NMS), achieving instant real-time throughput.',
      badge: 'YOLOv10 Breakthrough',
      details: ['One-to-one matched predictions', 'No greedy box clustering', 'Sub-millisecond postprocessing']
    }
  ];

  const yoloEvolution = [
    { version: 'YOLOv1 (2015)', author: 'Joseph Redmon', trait: 'Unified 7×7 grid single-pass detection, 45 FPS real-time pioneer.' },
    { version: 'YOLOv3 (2018)', author: 'Redmon & Farhadi', trait: 'Darknet-53 backbone with multi-scale 3-layer feature pyramid heads.' },
    { version: 'YOLOv5 (2020)', author: 'Glenn Jocher', trait: 'PyTorch native implementation with mosaic augmentation and auto-anchor.' },
    { version: 'YOLOv8 (2023)', author: 'Ultralytics', trait: 'Anchor-free decoupled head with C2f module and TaskAlignedAssigner.' },
    { version: 'YOLOv10 (2024)', author: 'Tsinghua Univ.', trait: 'Consistent Dual Assignment for real-time NMS-free end-to-end execution.' },
    { version: 'YOLO11 (2024)', author: 'Ultralytics', trait: 'C3k2 architecture with spatial attention mechanism and peak mAP/parameter ratio.' },
  ];

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto py-4 text-slate-200">
      {/* Hero Overview */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 mb-2">
            <Zap className="w-4 h-4" />
            <span>Local Computer Vision Architecture</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How YOLO Operates 100% Locally on Your Machine
          </h2>
          <p className="text-sm text-slate-300 mt-3 leading-relaxed">
            YOLO (You Only Look Once) reframes object detection from a two-stage region-proposal pipeline into a unified single-pass regression problem. Utilizing browser WebAssembly with SIMD vector extensions and WebGPU compute shaders, the complete deep neural network executes directly inside your device's memory with zero server hops or cloud latency.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div>
              <span className="text-xs text-slate-400 block">Single-Pass Efficiency</span>
              <span className="text-lg font-bold text-cyan-400 font-mono tabular-nums">1-Forward Pass</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Whole-image global context at inference time</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Edge Privacy</span>
              <span className="text-lg font-bold text-emerald-400 font-mono">Zero Telemetry</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Frames never leave your local browser runtime</p>
            </div>
            <div>
              <span className="text-xs text-slate-400 block">Class Vocabulary</span>
              <span className="text-lg font-bold text-amber-400 font-mono tabular-nums">80 Classes</span>
              <p className="text-[11px] text-slate-400 mt-0.5">Full Microsoft COCO detection ontology</p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Step-by-Step Architecture Pipeline */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>The 5-Stage YOLO Processing Pipeline</span>
          </h3>
          <span className="text-xs text-slate-400">Click a stage to inspect</span>
        </div>

        {/* Pipeline Stage Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {stages.map((st, idx) => (
            <button
              key={st.title}
              onClick={() => setSelectedStage(idx)}
              className={`p-3 rounded-xl border text-left transition-all ${
                selectedStage === idx
                  ? 'bg-cyan-950/60 border-cyan-400 text-white shadow-lg shadow-cyan-950/30'
                  : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <span className="text-[10px] font-mono block text-cyan-400 mb-1">{st.badge}</span>
              <span className="text-xs font-bold block truncate">{st.title.split('. ')[1]}</span>
            </button>
          ))}
        </div>

        {/* Active Stage Detailed Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 mb-4">
            <div>
              <span className="text-xs font-mono text-cyan-400">{stages[selectedStage].badge}</span>
              <h4 className="text-lg font-bold text-white">{stages[selectedStage].title}</h4>
              <p className="text-xs text-slate-400">{stages[selectedStage].subtitle}</p>
            </div>
            <span className="text-xs font-mono bg-slate-800 px-2.5 py-1 rounded text-slate-300">
              Stage {selectedStage + 1} of {stages.length}
            </span>
          </div>

          <p className="text-sm text-slate-200 leading-relaxed">
            {stages[selectedStage].description}
          </p>

          <div className="mt-4 pt-4 border-t border-slate-800/80">
            <span className="text-xs font-semibold text-slate-400 block mb-2">Key Properties</span>
            <div className="flex flex-wrap gap-2">
              {stages[selectedStage].details.map((detail) => (
                <span
                  key={detail}
                  className="flex items-center gap-1.5 text-xs bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{detail}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Evolution Timeline */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-6">
        <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span>YOLO Architectural Evolution (2015 – 2026)</span>
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          How real-time object detection evolved from coarse 7×7 grids to sub-millisecond NMS-free transformers
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {yoloEvolution.map((evo) => (
            <div
              key={evo.version}
              className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-white font-mono">{evo.version}</span>
                  <span className="text-[10px] text-slate-400">{evo.author}</span>
                </div>
                <p className="text-xs text-slate-300 leading-normal">{evo.trait}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
