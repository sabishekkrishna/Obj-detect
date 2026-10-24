import React, { useEffect, useRef, useState, useCallback } from 'react';
import type { Detection, DisplaySettings } from '../types/yolo';

interface DetectionCanvasProps {
  imageElement?: HTMLImageElement | null;
  videoElement?: HTMLVideoElement | null;
  detections: Detection[];
  displaySettings: DisplaySettings;
  hoveredDetectionId: string | null;
  selectedDetectionId: string | null;
  onHoverDetection: (id: string | null) => void;
  onSelectDetection: (detection: Detection | null) => void;
  canvasRefCallback?: (canvas: HTMLCanvasElement | null) => void;
}

export const DetectionCanvas: React.FC<DetectionCanvasProps> = ({
  imageElement,
  videoElement,
  detections,
  displaySettings,
  hoveredDetectionId,
  selectedDetectionId,
  onHoverDetection,
  onSelectDetection,
  canvasRefCallback,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<{ width: number; height: number }>({ width: 640, height: 480 });

  // Update canvasRefCallback when canvas mounts
  useEffect(() => {
    if (canvasRefCallback) {
      canvasRefCallback(canvasRef.current);
    }
  }, [canvasRefCallback]);

  // Update dimensions when media element updates
  useEffect(() => {
    if (imageElement && imageElement.naturalWidth) {
      setNaturalDimensions({
        width: imageElement.naturalWidth,
        height: imageElement.naturalHeight
      });
    } else if (videoElement && videoElement.videoWidth) {
      setNaturalDimensions({
        width: videoElement.videoWidth,
        height: videoElement.videoHeight
      });
    }
  }, [imageElement, videoElement]);

  // Render loop
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = naturalDimensions.width;
    const height = naturalDimensions.height;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw base media
    if (imageElement && imageElement.complete && imageElement.naturalWidth > 0) {
      ctx.drawImage(imageElement, 0, 0, width, height);
    } else if (videoElement && videoElement.readyState >= 2) {
      ctx.drawImage(videoElement, 0, 0, width, height);
    }

    // Draw bounding boxes and labels
    for (const detection of detections) {
      const isHovered = detection.id === hoveredDetectionId;
      const isSelected = detection.id === selectedDetectionId;
      const { xmin, ymin, xmax, ymax } = detection.box;
      const boxW = xmax - xmin;
      const boxH = ymax - ymin;

      const baseColor = detection.color;

      // Box fill with adjustable opacity
      const fillOpacity = isSelected ? 0.35 : isHovered ? 0.25 : displaySettings.fillOpacity;
      ctx.fillStyle = hexToRgba(baseColor, fillOpacity);
      ctx.fillRect(xmin, ymin, boxW, boxH);

      // Box border stroke
      const strokeWidth = (isSelected || isHovered) 
        ? Math.max(3, displaySettings.strokeWidth + 2) 
        : displaySettings.strokeWidth;
      
      ctx.lineWidth = strokeWidth;
      ctx.strokeStyle = baseColor;
      
      if (isSelected) {
        ctx.setLineDash([6, 3]);
      } else {
        ctx.setLineDash([]);
      }
      ctx.strokeRect(xmin, ymin, boxW, boxH);
      ctx.setLineDash([]);

      // Draw Corner Accent Brackets for high-tech HUD look
      const cornerLength = Math.min(14, boxW / 4, boxH / 4);
      ctx.lineWidth = strokeWidth + 1.5;
      ctx.strokeStyle = '#FFFFFF';
      
      // Top-Left
      ctx.beginPath();
      ctx.moveTo(xmin, ymin + cornerLength);
      ctx.lineTo(xmin, ymin);
      ctx.lineTo(xmin + cornerLength, ymin);
      ctx.stroke();

      // Bottom-Right
      ctx.beginPath();
      ctx.moveTo(xmax - cornerLength, ymax);
      ctx.lineTo(xmax, ymax);
      ctx.lineTo(xmax, ymax - cornerLength);
      ctx.stroke();

      // Render Label Tag
      if (displaySettings.showLabels) {
        const scoreText = displaySettings.showScores ? ` ${(detection.score * 100).toFixed(0)}%` : '';
        const labelText = `${detection.label}${scoreText}`;

        ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const textWidth = textMetrics.width;
        const tagHeight = 22;
        const tagWidth = textWidth + 14;

        // Position label above the box; if too close to top edge, place inside box
        let tagY = ymin - tagHeight - 2;
        if (tagY < 0) {
          tagY = ymin + 2;
        }

        let tagX = xmin;
        if (tagX + tagWidth > width) {
          tagX = width - tagWidth - 2;
        }

        // Tag background
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        // Rounded rectangle for tag
        roundRect(ctx, tagX, tagY, tagWidth, tagHeight, 4);
        ctx.fill();

        // Tag text
        ctx.fillStyle = '#0F172A'; // deep slate for crisp contrast on bright tag colors
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, tagX + 7, tagY + tagHeight / 2);
      }
    }
  }, [
    imageElement,
    videoElement,
    detections,
    displaySettings,
    hoveredDetectionId,
    selectedDetectionId,
    naturalDimensions
  ]);

  useEffect(() => {
    let animId: number;
    // If video is actively playing, use requestAnimationFrame
    if (videoElement && !videoElement.paused) {
      const loop = () => {
        drawFrame();
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(animId);
    } else {
      drawFrame();
    }
  }, [drawFrame, videoElement]);

  // Handle mouse move for box hover detection
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Find smallest bounding box containing mouse cursor (topmost object)
    let foundDetection: Detection | null = null;
    let smallestArea = Infinity;

    for (const d of detections) {
      const { xmin, ymin, xmax, ymax } = d.box;
      if (mouseX >= xmin && mouseX <= xmax && mouseY >= ymin && mouseY <= ymax) {
        if (d.area < smallestArea) {
          smallestArea = d.area;
          foundDetection = d;
        }
      }
    }

    if (foundDetection) {
      onHoverDetection(foundDetection.id);
      canvas.style.cursor = 'pointer';
    } else {
      onHoverDetection(null);
      canvas.style.cursor = 'crosshair';
    }
  };

  const handleClick = () => {
    if (hoveredDetectionId) {
      const detection = detections.find(d => d.id === hoveredDetectionId) || null;
      onSelectDetection(detection);
    } else {
      onSelectDetection(null);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full flex items-center justify-center bg-slate-950/80 rounded-xl overflow-hidden border border-slate-800/80 shadow-2xl min-h-[380px]"
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => onHoverDetection(null)}
        onClick={handleClick}
        className="max-w-full max-h-[680px] w-auto h-auto object-contain cursor-crosshair select-none transition-all duration-150"
      />
    </div>
  );
};

function hexToRgba(hex: string, alpha: number): string {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) || 0;
  const g = parseInt(cleanHex.substring(2, 4), 16) || 0;
  const b = parseInt(cleanHex.substring(4, 6), 16) || 0;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
