import { mapClassName, type KioskClass } from '../kiosk.config';
import type { Box } from '../logic/depositMachine';

export interface RawBox { cls: number; conf: number; x1: number; y1: number; x2: number; y2: number }

function iou(a: RawBox, b: RawBox) {
  const ix = Math.max(0, Math.min(a.x2, b.x2) - Math.max(a.x1, b.x1));
  const iy = Math.max(0, Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1));
  const inter = ix * iy;
  const ua = (a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter;
  return ua <= 0 ? 0 : inter / ua;
}

/** Class-agnostic NMS, keep top K. */
export function nms(boxes: RawBox[], iouThr = 0.5, keep = 3): RawBox[] {
  const sorted = [...boxes].sort((a, b) => b.conf - a.conf);
  const out: RawBox[] = [];
  for (const b of sorted) {
    if (out.every((o) => iou(o, b) < iouThr)) out.push(b);
    if (out.length >= keep) break;
  }
  return out;
}

/** Decode Ultralytics raw output [1, 4+nc, N] (cx,cy,w,h + class scores, no objectness). Coordinates normalised 0..1. */
export function decodeRaw(data: Float32Array, dims: readonly number[], imgsz: number, confThr = 0.25): RawBox[] {
  const ch = dims[1];
  const n = dims[2];
  const nc = ch - 4;
  const out: RawBox[] = [];
  for (let i = 0; i < n; i++) {
    let best = 0;
    let cls = 0;
    for (let c = 0; c < nc; c++) {
      const s = data[(4 + c) * n + i];
      if (s > best) {
        best = s;
        cls = c;
      }
    }
    if (best < confThr) continue;
    const cx = data[i] / imgsz;
    const cy = data[n + i] / imgsz;
    const w = data[2 * n + i] / imgsz;
    const h = data[3 * n + i] / imgsz;
    out.push({ cls, conf: best, x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 });
  }
  return nms(out);
}

/** Decode end-to-end output [1, K, 6] = x1,y1,x2,y2,conf,cls (already NMS'd). */
export function decodeEnd2End(data: Float32Array, dims: readonly number[], imgsz: number, confThr = 0.25): RawBox[] {
  const k = dims[1];
  const out: RawBox[] = [];
  for (let i = 0; i < k; i++) {
    const o = i * 6;
    const conf = data[o + 4];
    if (conf < confThr) continue;
    out.push({ cls: Math.round(data[o + 5]), conf, x1: data[o] / imgsz, y1: data[o + 1] / imgsz, x2: data[o + 2] / imgsz, y2: data[o + 3] / imgsz });
  }
  return out.slice(0, 3);
}

/** Map raw class indices to kiosk classes and drop boxes that are tiny or mostly outside the ROI. */
export function toKioskBoxes(raw: RawBox[], classes: string[]): Box[] {
  const res: Box[] = [];
  for (const b of raw) {
    const w = b.x2 - b.x1;
    const h = b.y2 - b.y1;
    if (w * h < 0.02) continue;
    const cx = (b.x1 + b.x2) / 2;
    const cy = (b.y1 + b.y2) / 2;
    if (cx < 0 || cx > 1 || cy < 0 || cy > 1) continue;
    const cls: KioskClass = mapClassName(classes[b.cls] ?? '');
    res.push({ cls, conf: b.conf, x1: b.x1, y1: b.y1, x2: b.x2, y2: b.y2 });
  }
  return res;
}
