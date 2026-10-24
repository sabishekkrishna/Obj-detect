import type { Detection } from '../types/yolo';

/**
 * Exports detections in Ultralytics / Darknet YOLO annotation format (.txt)
 * Line format: <class_id> <x_center> <y_center> <width> <height>
 */
export function exportYOLOFormat(detections: Detection[], filename: string = 'yolo_annotations.txt') {
  const lines = detections.map(d => {
    const { xCenter, yCenter, width, height } = d.normalizedBox;
    return `${d.classId} ${xCenter.toFixed(6)} ${yCenter.toFixed(6)} ${width.toFixed(6)} ${height.toFixed(6)}`;
  });

  const content = lines.join('\n');
  downloadBlob(content, filename, 'text/plain;charset=utf-8');
}

/**
 * Exports detections in COCO JSON format
 */
export function exportCOCOFormat(
  detections: Detection[],
  imageWidth: number,
  imageHeight: number,
  imageName: string = 'image.jpg',
  filename: string = 'coco_annotations.json'
) {
  const uniqueLabels = Array.from(new Set(detections.map(d => d.label)));
  const categories = uniqueLabels.map((name, index) => ({
    id: index + 1,
    name,
    supercategory: 'object'
  }));

  const labelToCatId = new Map(categories.map(c => [c.name, c.id]));

  const annotations = detections.map((d, index) => {
    const width = d.box.xmax - d.box.xmin;
    const height = d.box.ymax - d.box.ymin;
    return {
      id: index + 1,
      image_id: 1,
      category_id: labelToCatId.get(d.label) || 1,
      bbox: [d.box.xmin, d.box.ymin, width, height],
      area: width * height,
      score: d.score,
      iscrowd: 0
    };
  });

  const cocoData = {
    info: {
      year: new Date().getFullYear(),
      version: '1.0',
      description: 'YOLO Local Object Detection Annotations',
      date_created: new Date().toISOString()
    },
    images: [
      {
        id: 1,
        width: imageWidth,
        height: imageHeight,
        file_name: imageName
      }
    ],
    categories,
    annotations
  };

  const content = JSON.stringify(cocoData, null, 2);
  downloadBlob(content, filename, 'application/json;charset=utf-8');
}

/**
 * Exports detections as a CSV table
 */
export function exportCSVFormat(detections: Detection[], filename: string = 'detections.csv') {
  const headers = ['id', 'class_id', 'label', 'confidence', 'xmin', 'ymin', 'xmax', 'ymax', 'width', 'height', 'area_px', 'frame_percent'];
  const rows = detections.map(d => [
    d.id,
    d.classId,
    `"${d.label}"`,
    d.score,
    d.box.xmin,
    d.box.ymin,
    d.box.xmax,
    d.box.ymax,
    d.box.xmax - d.box.xmin,
    d.box.ymax - d.box.ymin,
    d.area,
    `${d.areaPercent}%`
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  downloadBlob(csvContent, filename, 'text/csv;charset=utf-8');
}

/**
 * Saves canvas snapshot as image file
 */
export function downloadCanvasImage(canvas: HTMLCanvasElement, filename: string = 'annotated_yolo_detection.png') {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

/**
 * Crops a single detection bounding box and downloads it
 */
export function cropAndDownloadDetection(
  sourceCanvas: HTMLCanvasElement,
  detection: Detection,
  filename?: string
) {
  const { xmin, ymin, xmax, ymax } = detection.box;
  const cropW = Math.max(1, xmax - xmin);
  const cropH = Math.max(1, ymax - ymin);

  const cropCanvas = document.createElement('canvas');
  cropCanvas.width = cropW;
  cropCanvas.height = cropH;
  const ctx = cropCanvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(sourceCanvas, xmin, ymin, cropW, cropH, 0, 0, cropW, cropH);

  const fname = filename || `${detection.label}_crop_${Math.round(detection.score * 100)}.png`;
  downloadCanvasImage(cropCanvas, fname);
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
