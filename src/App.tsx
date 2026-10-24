/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Upload, 
  Film, 
  Image as ImageIcon, 
  Sliders, 
  Cpu, 
  Zap, 
  Layers, 
  Download, 
  RefreshCw, 
  Sparkles,
  Info,
  Maximize2
} from 'lucide-react';

import { TopBar } from './components/TopBar';
import { DetectionCanvas } from './components/DetectionCanvas';
import { ControlPanel } from './components/ControlPanel';
import { DetectionList } from './components/DetectionList';
import { WebcamController } from './components/WebcamController';
import { VideoController } from './components/VideoController';
import { ExportModal } from './components/ExportModal';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { BatchQueue, type BatchItem } from './components/BatchQueue';

import { 
  AVAILABLE_MODELS, 
  type Detection, 
  type DisplaySettings, 
  type DownloadProgress, 
  type InferenceStats, 
  type ModelInfo, 
  type SampleMedia 
} from './types/yolo';
import { yoloService, isWebGPUSupported } from './services/yoloService';

// Pre-generated benchmark sample images
const SAMPLE_MEDIA: SampleMedia[] = [
  {
    id: 'sample_traffic',
    title: 'Street Traffic',
    category: 'Vehicles & Pedestrians',
    path: '/src/assets/images/yolo_traffic_street_1792864579225.jpg',
    description: 'City intersection with cars, pedestrians, traffic lights, and crosswalk'
  },
  {
    id: 'sample_desk',
    title: 'Modern Workspace',
    category: 'Electronics & Office',
    path: '/src/assets/images/yolo_desk_workspace_1792864580235.jpg',
    description: 'Top-down desk layout with laptop, keyboard, mouse, mug, and notebook'
  },
  {
    id: 'sample_pets',
    title: 'Living Room Pets',
    category: 'Animals & Furniture',
    path: '/src/assets/images/yolo_pets_livingroom_1792864580722.jpg',
    description: 'Interior room with golden retriever dog, cat, couch, and house plants'
  },
  {
    id: 'sample_park',
    title: 'Park Recreation',
    category: 'Sports & Outdoor',
    path: '/src/assets/images/yolo_sports_park_1792864581598.jpg',
    description: 'Public tennis court with players, bench, racket, and backpack'
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'studio' | 'webcam' | 'architecture' | 'batch'>('studio');
  const [inputMode, setInputMode] = useState<'sample' | 'upload' | 'video'>('sample');
  const [currentSampleIndex, setCurrentSampleIndex] = useState<number>(0);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>(SAMPLE_MEDIA[0].path);
  const [currentImageName, setCurrentImageName] = useState<string>('yolo_traffic_street.jpg');
  
  // Model state
  const [selectedModel, setSelectedModel] = useState<ModelInfo>(AVAILABLE_MODELS[0]);
  const [device, setDevice] = useState<'webgpu' | 'wasm'>('wasm');
  const [webGpuSupported, setWebGpuSupported] = useState<boolean>(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [isInferenceRunning, setIsInferenceRunning] = useState<boolean>(false);

  // Detections & Metrics
  const [detections, setDetections] = useState<Detection[]>([]);
  const [inferenceStats, setInferenceStats] = useState<InferenceStats | null>(null);
  const [hoveredDetectionId, setHoveredDetectionId] = useState<string | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<Detection | null>(null);

  // Settings
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    showLabels: true,
    showScores: true,
    fillOpacity: 0.15,
    strokeWidth: 2,
    minConfidence: 0.25,
    iouThreshold: 0.45,
    selectedCategories: []
  });

  // Modal
  const [isExportOpen, setIsExportOpen] = useState<boolean>(false);

  // DOM References
  const imageElementRef = useRef<HTMLImageElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const canvasElementRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check WebGPU availability on mount
  useEffect(() => {
    isWebGPUSupported().then((supported) => {
      setWebGpuSupported(supported);
      if (supported) {
        setDevice('webgpu');
        yoloService.setDevice('webgpu');
      }
    });
  }, []);

  // Update device in service when changed
  const handleChangeDevice = async (newDevice: 'webgpu' | 'wasm') => {
    setDevice(newDevice);
    await yoloService.setDevice(newDevice);
  };

  // Initialize selected model weights
  const initializeModel = useCallback(async (model: ModelInfo) => {
    setIsModelReady(false);
    const success = await yoloService.initModel(model.hfModelId, (prog) => {
      setDownloadProgress(prog);
      if (prog.status === 'ready') {
        setIsModelReady(true);
      }
    });

    if (success) {
      setIsModelReady(true);
    }
  }, []);

  // Initialize model on startup and on model change
  useEffect(() => {
    initializeModel(selectedModel);
  }, [selectedModel, initializeModel]);

  // Run detection on current image
  const runDetection = useCallback(async (imageUrl: string) => {
    setIsInferenceRunning(true);
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      imageElementRef.current = img;

      const res = await yoloService.detect(
        img,
        displaySettings.minConfidence,
        img.naturalWidth,
        img.naturalHeight
      );

      // Apply class filter if specified
      let filtered = res.detections;
      if (displaySettings.selectedCategories.length > 0) {
        filtered = filtered.filter(d => displaySettings.selectedCategories.includes(d.label));
      }

      setDetections(filtered);
      setInferenceStats(res.stats);
    } catch (err) {
      console.warn('Inference error:', err);
    } finally {
      setIsInferenceRunning(false);
    }
  }, [displaySettings.minConfidence, displaySettings.selectedCategories]);

  // Trigger initial detection on start
  useEffect(() => {
    runDetection(currentImageUrl);
  }, [currentImageUrl, runDetection]);

  // Re-run detection or filter when confidence threshold changes
  useEffect(() => {
    if (activeTab === 'studio' && inputMode !== 'video') {
      runDetection(currentImageUrl);
    }
  }, [displaySettings.minConfidence, displaySettings.selectedCategories]);

  // Switch sample scene
  const handleSelectSample = (sample: SampleMedia, idx: number) => {
    setInputMode('sample');
    setCurrentSampleIndex(idx);
    setCurrentImageUrl(sample.path);
    setCurrentImageName(`${sample.id}.jpg`);
    setSelectedDetection(null);
  };

  // Handle uploaded image file
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setInputMode('upload');
      setCurrentImageUrl(url);
      setCurrentImageName(file.name);
      setSelectedDetection(null);
    }
  };

  // Handle drag and drop on studio viewport
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setInputMode('upload');
      setCurrentImageUrl(url);
      setCurrentImageName(file.name);
      setSelectedDetection(null);
    }
  };

  // Inspect item from Batch Queue in Studio
  const handleInspectBatchItem = (item: BatchItem) => {
    setCurrentImageUrl(item.url);
    setCurrentImageName(item.name);
    setInputMode('upload');
    setActiveTab('studio');
    setDetections(item.detections);
    if (item.stats) setInferenceStats(item.stats);
  };

  // Callback from webcam or video controller
  const handleStreamDetections = (newDetections: Detection[], stats: InferenceStats) => {
    setDetections(newDetections);
    setInferenceStats(stats);
  };

  // Capture snapshot from webcam
  const handleCaptureWebcamSnapshot = (dataUrl: string) => {
    setCurrentImageUrl(dataUrl);
    setCurrentImageName(`webcam_snapshot_${Date.now()}.jpg`);
    setInputMode('upload');
    setActiveTab('studio');
    runDetection(dataUrl);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-200">
      {/* Top Bar following strict 3-zone contract */}
      <TopBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenExport={() => setIsExportOpen(true)}
        detectionsCount={detections.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1560px] w-full mx-auto p-4 sm:p-6 flex flex-col gap-6">
        {/* Sub-Header Status Strip */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 border border-slate-800/80 rounded-xl px-5 py-3 text-xs text-slate-300">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Local Model:</span>
              <span className="font-mono text-cyan-300">{selectedModel.name}</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-400">
              Acceleration: <span className="font-mono text-slate-200">{device === 'webgpu' ? 'WebGPU' : 'WebAssembly SIMD'}</span>
            </span>
            <span className="text-slate-600 hidden sm:inline">·</span>
            <span className="text-slate-400">
              Runtime: <span className="text-emerald-400 font-medium">100% Client-Side Memory</span>
            </span>
          </div>

          {inferenceStats && (
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-400">
              <span>
                Latency: <span className="text-cyan-400 font-bold">{inferenceStats.totalTimeMs}ms</span>
              </span>
              <span>
                Throughput: <span className="text-amber-400 font-bold">{inferenceStats.fps} FPS</span>
              </span>
              <span>
                Found: <span className="text-white font-bold">{detections.length} objects</span>
              </span>
            </div>
          )}
        </div>

        {/* TAB 1: Detection Studio */}
        {activeTab === 'studio' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Media Viewport & Input Selectors (8 cols) */}
            <div className="lg:col-span-8 flex flex-col gap-4">
              {/* Media Mode Selector */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/70 border border-slate-800/80 rounded-xl p-3">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setInputMode('sample')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      inputMode === 'sample'
                        ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Benchmark Samples</span>
                  </button>

                  <button
                    onClick={() => {
                      setInputMode('upload');
                      fileInputRef.current?.click();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      inputMode === 'upload'
                        ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                  </button>

                  <button
                    onClick={() => setInputMode('video')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                      inputMode === 'video'
                        ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>Video Analyzer</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => runDetection(currentImageUrl)}
                    disabled={isInferenceRunning}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-semibold rounded-lg text-cyan-300 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isInferenceRunning ? 'animate-spin' : ''}`} />
                    <span>Re-Run Inference</span>
                  </button>
                </div>
              </div>

              {/* Sample Images Strip (when in sample mode) */}
              {inputMode === 'sample' && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SAMPLE_MEDIA.map((sample, idx) => (
                    <button
                      key={sample.id}
                      onClick={() => handleSelectSample(sample, idx)}
                      className={`group text-left p-2 rounded-xl border transition-all overflow-hidden ${
                        currentSampleIndex === idx
                          ? 'bg-cyan-950/40 border-cyan-400 ring-1 ring-cyan-400/30'
                          : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="aspect-video w-full rounded-lg overflow-hidden bg-slate-950 mb-1.5 relative">
                        <img
                          src={sample.path}
                          alt={sample.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <span className="text-xs font-semibold text-white block truncate">
                        {sample.title}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {sample.category}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Video Player Component (when in video mode) */}
              {inputMode === 'video' && (
                <VideoController
                  onDetectionsUpdate={handleStreamDetections}
                  displaySettings={displaySettings}
                  videoRefCallback={(vid) => { videoElementRef.current = vid; }}
                  onFrameExtracted={(url) => {
                    setCurrentImageUrl(url);
                    setInputMode('upload');
                  }}
                />
              )}

              {/* Primary Detection Canvas Viewport */}
              <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="relative">
                <DetectionCanvas
                  imageElement={inputMode !== 'video' ? imageElementRef.current : null}
                  videoElement={inputMode === 'video' ? videoElementRef.current : null}
                  detections={detections}
                  displaySettings={displaySettings}
                  hoveredDetectionId={hoveredDetectionId}
                  selectedDetectionId={selectedDetection?.id || null}
                  onHoverDetection={setHoveredDetectionId}
                  onSelectDetection={setSelectedDetection}
                  canvasRefCallback={(canvas) => { canvasElementRef.current = canvas; }}
                />

                {/* Loading overlay during inference */}
                {isInferenceRunning && (
                  <div className="absolute top-4 right-4 bg-slate-900/80 backdrop-blur px-3 py-1.5 rounded-lg border border-cyan-500/40 text-xs text-cyan-300 flex items-center gap-2 shadow-lg">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Executing YOLO forward pass...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Controls & Detections List (4 cols) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              {/* Detection List & Object Inspector */}
              <DetectionList
                detections={detections}
                hoveredDetectionId={hoveredDetectionId}
                selectedDetection={selectedDetection}
                onHoverDetection={setHoveredDetectionId}
                onSelectDetection={setSelectedDetection}
                canvasElement={canvasElementRef.current}
              />

              {/* Inference Tuning Control Panel */}
              <ControlPanel
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                displaySettings={displaySettings}
                onUpdateSettings={(newSettings) => setDisplaySettings(prev => ({ ...prev, ...newSettings }))}
                device={device}
                onChangeDevice={handleChangeDevice}
                downloadProgress={downloadProgress}
                isModelReady={isModelReady}
                isLoading={isInferenceRunning}
                webGpuSupported={webGpuSupported}
              />
            </div>
          </div>
        )}

        {/* TAB 2: Realtime Webcam */}
        {activeTab === 'webcam' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 flex flex-col gap-4">
              <WebcamController
                onDetectionsUpdate={handleStreamDetections}
                displaySettings={displaySettings}
                videoRefCallback={(vid) => { videoElementRef.current = vid; }}
                onCaptureSnapshot={handleCaptureWebcamSnapshot}
                isModelReady={isModelReady}
              />

              {/* Live Canvas Overlay */}
              <DetectionCanvas
                videoElement={videoElementRef.current}
                detections={detections}
                displaySettings={displaySettings}
                hoveredDetectionId={hoveredDetectionId}
                selectedDetectionId={selectedDetection?.id || null}
                onHoverDetection={setHoveredDetectionId}
                onSelectDetection={setSelectedDetection}
                canvasRefCallback={(canvas) => { canvasElementRef.current = canvas; }}
              />
            </div>

            <div className="lg:col-span-4 flex flex-col gap-6">
              <DetectionList
                detections={detections}
                hoveredDetectionId={hoveredDetectionId}
                selectedDetection={selectedDetection}
                onHoverDetection={setHoveredDetectionId}
                onSelectDetection={setSelectedDetection}
                canvasElement={canvasElementRef.current}
              />

              <ControlPanel
                selectedModel={selectedModel}
                onSelectModel={setSelectedModel}
                displaySettings={displaySettings}
                onUpdateSettings={(newSettings) => setDisplaySettings(prev => ({ ...prev, ...newSettings }))}
                device={device}
                onChangeDevice={handleChangeDevice}
                downloadProgress={downloadProgress}
                isModelReady={isModelReady}
                isLoading={false}
                webGpuSupported={webGpuSupported}
              />
            </div>
          </div>
        )}

        {/* TAB 3: Batch Queue */}
        {activeTab === 'batch' && (
          <BatchQueue
            initialSamples={SAMPLE_MEDIA.map(s => ({ name: s.title, url: s.path }))}
            displaySettings={displaySettings}
            onInspectItem={handleInspectBatchItem}
          />
        )}

        {/* TAB 4: YOLO Architecture Guide */}
        {activeTab === 'architecture' && <ArchitectureGuide />}
      </main>

      {/* Export Annotations Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        detections={detections}
        canvasElement={canvasElementRef.current}
        imageWidth={imageElementRef.current?.naturalWidth || 640}
        imageHeight={imageElementRef.current?.naturalHeight || 480}
        imageName={currentImageName}
      />
    </div>
  );
}
