import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, 
  CameraOff, 
  FlipHorizontal, 
  Play, 
  Square, 
  Zap, 
  AlertCircle,
  Video
} from 'lucide-react';
import { yoloService } from '../services/yoloService';
import type { Detection, DisplaySettings, InferenceStats } from '../types/yolo';

interface WebcamControllerProps {
  onDetectionsUpdate: (detections: Detection[], stats: InferenceStats) => void;
  displaySettings: DisplaySettings;
  videoRefCallback: (video: HTMLVideoElement | null) => void;
  onCaptureSnapshot: (dataUrl: string) => void;
  isModelReady: boolean;
}

export const WebcamController: React.FC<WebcamControllerProps> = ({
  onDetectionsUpdate,
  displaySettings,
  videoRefCallback,
  onCaptureSnapshot,
  isModelReady,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [isMirrored, setIsMirrored] = useState<boolean>(true);
  const [targetFps, setTargetFps] = useState<number>(10);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);

  // Enumerate video input devices
  useEffect(() => {
    async function getDevices() {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
          const allDevices = await navigator.mediaDevices.enumerateDevices();
          const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
          setDevices(videoInputs);
          if (videoInputs.length > 0 && !selectedDeviceId) {
            setSelectedDeviceId(videoInputs[0].deviceId);
          }
        }
      } catch (err) {
        console.warn('Could not enumerate video devices:', err);
      }
    }
    getDevices();
  }, [selectedDeviceId]);

  // Pass video element reference up
  useEffect(() => {
    videoRefCallback(videoRef.current);
  }, [videoRefCallback]);

  // Start webcam stream
  const startCamera = async () => {
    setErrorMessage(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Failed to access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission denied. Please grant camera access in your browser settings to use live object detection.';
      } else if (err.name === 'NotFoundError') {
        msg = 'No camera device found on this computer.';
      }
      setErrorMessage(msg);
      setIsActive(false);
    }
  };

  // Stop webcam stream
  const stopCamera = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
    setIsProcessing(false);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Frame processing loop
  const processFrame = useCallback(async () => {
    if (!videoRef.current || !isActive || isProcessing) return;
    if (videoRef.current.readyState < 2) return;

    try {
      setIsProcessing(true);
      const res = await yoloService.detect(
        videoRef.current,
        displaySettings.minConfidence,
        videoRef.current.videoWidth,
        videoRef.current.videoHeight
      );

      // Filter by user selected category filters if any
      let filtered = res.detections;
      if (displaySettings.selectedCategories.length > 0) {
        filtered = filtered.filter(d => displaySettings.selectedCategories.includes(d.label));
      }

      onDetectionsUpdate(filtered, res.stats);
    } catch (err) {
      console.warn('Frame detection error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [isActive, isProcessing, displaySettings, onDetectionsUpdate]);

  // Set up interval according to targetFps
  useEffect(() => {
    if (isActive) {
      const intervalMs = Math.round(1000 / targetFps);
      timerRef.current = window.setInterval(processFrame, intervalMs);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [isActive, targetFps, processFrame]);

  // Snapshot capture
  const handleCapture = () => {
    if (!videoRef.current || !isActive) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (isMirrored) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    onCaptureSnapshot(dataUrl);
  };

  return (
    <div className="flex flex-col gap-4 bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 text-slate-200">
      {/* Hidden raw video element */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`hidden ${isMirrored ? 'scale-x-[-1]' : ''}`}
      />

      {/* Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Live Computer Webcam</h3>
        </div>

        <div className="flex items-center gap-2">
          {isActive ? (
            <button
              onClick={stopCamera}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-colors"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Stop Camera</span>
            </button>
          ) : (
            <button
              onClick={startCamera}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-semibold transition-colors shadow-sm active:scale-95"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Start Live Detection</span>
            </button>
          )}

          <button
            onClick={handleCapture}
            disabled={!isActive}
            title="Freeze and save current frame to Studio"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium rounded-lg text-slate-200 transition-colors"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Freeze Frame</span>
          </button>
        </div>
      </div>

      {/* Error Callout */}
      {errorMessage && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/40 border border-rose-800/60 text-xs text-rose-300">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold">Webcam Access Notice</p>
            <p className="text-rose-300/80 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Camera Tuning Settings */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-950/50 p-3 rounded-lg border border-slate-800">
        {/* Device select */}
        <div>
          <label className="text-slate-400 block text-[11px] mb-1">Video Device</label>
          <select
            value={selectedDeviceId}
            onChange={(e) => {
              setSelectedDeviceId(e.target.value);
              if (isActive) {
                setTimeout(startCamera, 100);
              }
            }}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            {devices.map((d, i) => (
              <option key={d.deviceId || i} value={d.deviceId}>
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        </div>

        {/* FPS Limiter */}
        <div>
          <div className="flex justify-between items-center text-[11px] mb-1">
            <span className="text-slate-400">Target Inference FPS</span>
            <span className="font-mono text-cyan-400 font-bold tabular-nums">{targetFps} FPS</span>
          </div>
          <input
            type="range"
            min="3"
            max="30"
            step="1"
            value={targetFps}
            onChange={(e) => setTargetFps(parseInt(e.target.value))}
            className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>3 (Low CPU)</span>
            <span>30 (Max)</span>
          </div>
        </div>

        {/* Mirror toggle */}
        <div className="flex flex-col justify-end">
          <button
            onClick={() => setIsMirrored(!isMirrored)}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md border text-xs transition-colors ${
              isMirrored
                ? 'bg-slate-800 border-slate-600 text-cyan-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
            <span>Mirror Camera Feed</span>
          </button>
        </div>
      </div>
    </div>
  );
};
