export interface RoiPx { x: number; y: number; size: number }

/** ROI in video pixels from fractional manifest ROI. */
export function roiPixels(video: HTMLVideoElement, roi: { cx: number; cy: number; size: number }): RoiPx {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;
  const size = Math.min(vw, vh) * roi.size;
  return { x: vw * roi.cx - size / 2, y: vh * roi.cy - size / 2, size };
}

/** Crop the ROI, resize to imgsz and convert to CHW float32 RGB in [0,1]. */
export function toTensorData(video: HTMLVideoElement, roi: RoiPx, imgsz: number, scratch: HTMLCanvasElement): Float32Array {
  scratch.width = imgsz;
  scratch.height = imgsz;
  const ctx = scratch.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(video, roi.x, roi.y, roi.size, roi.size, 0, 0, imgsz, imgsz);
  const { data } = ctx.getImageData(0, 0, imgsz, imgsz);
  const n = imgsz * imgsz;
  const out = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    out[i] = data[i * 4] / 255;
    out[n + i] = data[i * 4 + 1] / 255;
    out[2 * n + i] = data[i * 4 + 2] / 255;
  }
  return out;
}
