export interface BoundingBox {
  xmin: number;
  ymin: number;
  xmax: number;
  ymax: number;
}

export interface NormalizedBoundingBox {
  xCenter: number;
  yCenter: number;
  width: number;
  height: number;
}

export interface Detection {
  id: string;
  label: string;
  classId: number;
  score: number;
  box: BoundingBox;
  normalizedBox: NormalizedBoundingBox;
  color: string;
  area: number;
  areaPercent: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  hfModelId: string;
  architecture: string;
  sizeMb: number;
  description: string;
  latencyRating: 'Ultra Fast' | 'Fast' | 'Balanced';
  recommended?: boolean;
}

export interface DownloadProgress {
  status: 'init' | 'progress' | 'done' | 'ready';
  file?: string;
  progress?: number;
  loaded?: number;
  total?: number;
}

export interface InferenceStats {
  inferenceTimeMs: number;
  preprocessTimeMs: number;
  totalTimeMs: number;
  fps: number;
  detectionsCount: number;
  modelUsed: string;
  device: 'webgpu' | 'wasm';
}

export type InputMode = 'sample' | 'upload' | 'webcam' | 'video';

export interface DisplaySettings {
  showLabels: boolean;
  showScores: boolean;
  fillOpacity: number;
  strokeWidth: number;
  minConfidence: number;
  iouThreshold: number;
  selectedCategories: string[];
}

export interface SampleMedia {
  id: string;
  title: string;
  category: string;
  path: string;
  description: string;
}

export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat',
  'traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat',
  'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe', 'backpack',
  'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee', 'skis', 'snowboard', 'sports ball',
  'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket',
  'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake',
  'chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop',
  'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'sink',
  'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear', 'hair drier',
  'toothbrush'
];

export const CATEGORY_GROUPS: Record<string, string[]> = {
  'Vehicles': ['bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat'],
  'People': ['person'],
  'Animals': ['bird', 'cat', 'dog', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'],
  'Indoor & Living': ['chair', 'couch', 'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'book', 'clock', 'vase'],
  'Electronics': ['tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone', 'microwave', 'oven', 'toaster', 'refrigerator'],
  'Food & Dining': ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple', 'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake'],
  'Sports': ['frisbee', 'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard', 'tennis racket'],
  'Outdoor & Street': ['traffic light', 'fire hydrant', 'stop sign', 'parking meter', 'bench'],
  'Accessories': ['backpack', 'umbrella', 'handbag', 'tie', 'suitcase']
};

export const AVAILABLE_MODELS: ModelInfo[] = [
  {
    id: 'yolov10n',
    name: 'YOLOv10 Nano',
    hfModelId: 'onnx-community/yolov10n',
    architecture: 'YOLOv10 (NMS-Free End-to-End)',
    sizeMb: 11,
    description: 'Ultra-fast dual label assignment, zero-latency NMS post-processing. Ideal for real-time webcam & low-power CPUs.',
    latencyRating: 'Ultra Fast',
    recommended: true
  },
  {
    id: 'yolos-tiny',
    name: 'YOLOS Tiny',
    hfModelId: 'Xenova/yolos-tiny',
    architecture: 'Vision Transformer (ViT-Tiny)',
    sizeMb: 26,
    description: 'Compact transformer-based object detection without convolution inductive bias. Highly accurate for complex scenes.',
    latencyRating: 'Fast'
  },
  {
    id: 'yolo11n',
    name: 'YOLO11 Nano',
    hfModelId: 'onnx-community/yolo11n-onnx',
    architecture: 'YOLO11 (C3k2 & Spatial Attention)',
    sizeMb: 12,
    description: 'Latest generation YOLO with refined multi-scale feature fusion and high mAP precision.',
    latencyRating: 'Fast'
  }
];

// Color palette generator for consistent, high-contrast bounding boxes
const COLOR_PALETTE = [
  '#06B6D4', // cyan
  '#10B981', // emerald
  '#F59E0B', // amber
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#3B82F6', // blue
  '#14B8A6', // teal
  '#F97316', // orange
  '#6366F1', // indigo
  '#84CC16', // lime
  '#E11D48', // rose
  '#0EA5E9', // sky
];

export function getClassColor(label: string): string {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash << 5) - hash + label.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % COLOR_PALETTE.length;
  return COLOR_PALETTE[index];
}
