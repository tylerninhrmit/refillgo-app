export interface Manifest {
  file: string;              // e.g. "/models/aquasense-640.onnx"
  name: string;              // display name
  classes: string[];         // raw class names in model order
  imgsz: number;             // square input size
  inputName: string;         // usually "images"
  outputName: string;        // usually "output0"
  layout: 'yolo-raw' | 'end2end';
  roi?: { cx: number; cy: number; size: number }; // fractions of the video frame (size relative to min side)
}

export const DEFAULT_ROI = { cx: 0.5, cy: 0.5, size: 0.85 };

export async function loadManifest(): Promise<Manifest | null> {
  try {
    const res = await fetch('/models/manifest.json', { cache: 'no-cache' });
    if (!res.ok) return null;
    const m = (await res.json()) as Manifest;
    if (!m.file || !m.classes?.length) return null;
    return m;
  } catch {
    return null;
  }
}
