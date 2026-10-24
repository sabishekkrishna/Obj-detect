import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Upload, 
  Film, 
  Scan,
  Repeat
} from 'lucide-react';
import { yoloService } from '../services/yoloService';
import type { Detection, DisplaySettings, InferenceStats } from '../types/yolo';

interface VideoControllerProps {
  onDetectionsUpdate: (detections: Detection[], stats: InferenceStats) => void;
  displaySettings: DisplaySettings;
  videoRefCallback: (video: HTMLVideoElement | null) => void;
  onFrameExtracted: (dataUrl: string) => void;
}

export const VideoController: React.FC<VideoControllerProps> = ({
  onDetectionsUpdate,
  displaySettings,
  videoRefCallback,
  onFrameExtracted,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>('sample_clip.mp4');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [autoDetectOnPlay, setAutoDetectOnPlay] = useState<boolean>(true);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    videoRefCallback(videoRef.current);
  }, [videoRefCallback]);

  // Handle uploaded video file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoName(file.name);
      setIsPlaying(false);
      if (videoRef.current) {
        videoRef.current.src = url;
        videoRef.current.load();
      }
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      runFrameDetection();
    }
  };

  const stepFrame = (deltaSeconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + deltaSeconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    setTimeout(runFrameDetection, 50);
  };

  // Run detection on current video frame
  const runFrameDetection = useCallback(async () => {
    if (!videoRef.current || isProcessing) return;
    if (videoRef.current.readyState < 2) return;

    try {
      setIsProcessing(true);
      const res = await yoloService.detect(
        videoRef.current,
        displaySettings.minConfidence,
        videoRef.current.videoWidth,
        videoRef.current.videoHeight
      );

      let filtered = res.detections;
      if (displaySettings.selectedCategories.length > 0) {
        filtered = filtered.filter(d => displaySettings.selectedCategories.includes(d.label));
      }

      onDetectionsUpdate(filtered, res.stats);
    } catch (err) {
      console.warn('Video frame inference error:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [displaySettings, isProcessing, onDetectionsUpdate]);

  // Loop detection while playing
  useEffect(() => {
    let interval: number;
    if (isPlaying && autoDetectOnPlay) {
      interval = window.setInterval(() => {
        runFrameDetection();
      }, 150); // ~6-7 FPS inference to maintain smooth video playback
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, autoDetectOnPlay, runFrameDetection]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="flex flex-col gap-3 bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 text-slate-200">
      {/* Hidden native video tag */}
      <video
        ref={videoRef}
        playsInline
        muted
        loop
        onTimeUpdate={() => videoRef.current && setCurrentTime(videoRef.current.currentTime)}
        onLoadedMetadata={() => videoRef.current && setDuration(videoRef.current.duration)}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Header and Load Video Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/70 pb-3">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Video File Analyzer</h3>
          <span className="text-xs text-slate-400 truncate max-w-[200px]">{videoName}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-medium rounded-lg text-slate-200 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Load MP4 / WebM</span>
          </button>
          <button
            onClick={runFrameDetection}
            disabled={!videoSrc}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
          >
            <Scan className="w-3.5 h-3.5" />
            <span>Detect Frame</span>
          </button>
        </div>
      </div>

      {/* Player Controls */}
      <div className="flex flex-col gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
        {/* Scrub Bar */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-slate-400 w-12 tabular-nums">
            {formatTime(currentTime)}
          </span>
          <input
            type="range"
            min="0"
            max={duration || 100}
            step="0.05"
            value={currentTime}
            onChange={handleSeek}
            disabled={!videoSrc}
            className="flex-1 accent-cyan-400 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-[11px] font-mono text-slate-400 w-12 tabular-nums text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons Row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => stepFrame(-0.1)}
              disabled={!videoSrc}
              title="Previous frame (-0.1s)"
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-30"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              onClick={togglePlay}
              disabled={!videoSrc}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-400 text-slate-950 hover:bg-cyan-300 font-bold disabled:opacity-30 transition-all active:scale-95"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => stepFrame(0.1)}
              disabled={!videoSrc}
              title="Next frame (+0.1s)"
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 disabled:opacity-30"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
            <input
              type="checkbox"
              checked={autoDetectOnPlay}
              onChange={(e) => setAutoDetectOnPlay(e.target.checked)}
              className="accent-cyan-400 rounded"
            />
            <span>Continuous Detection on Play</span>
          </label>
        </div>
      </div>
    </div>
  );
};
