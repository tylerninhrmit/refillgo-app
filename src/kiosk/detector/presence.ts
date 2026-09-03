import type { RoiPx } from './preprocess';

const N = 64;

/** Cheap "is something in the tray" signal: fraction of ROI pixels that differ from a slowly adapting empty-tray reference. */
export class PresenceDetector {
  private ref: Float32Array | null = null;
  private cur = new Float32Array(N * N);
  private canvas = document.createElement('canvas');
  private lastAdapt = 0;

  constructor() {
    this.canvas.width = N;
    this.canvas.height = N;
  }

  reset() {
    this.ref = null;
  }

  /** Returns changed-pixel fraction (0..1). Adapts the reference slowly while the tray looks empty. */
  measure(video: HTMLVideoElement, roi: RoiPx, now: number, allowAdapt: boolean): number {
    const ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(video, roi.x, roi.y, roi.size, roi.size, 0, 0, N, N);
    const { data } = ctx.getImageData(0, 0, N, N);
    for (let i = 0; i < N * N; i++) this.cur[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255;
    if (!this.ref) {
      this.ref = Float32Array.from(this.cur);
      this.lastAdapt = now;
      return 0;
    }
    let changed = 0;
    for (let i = 0; i < N * N; i++) if (Math.abs(this.cur[i] - this.ref[i]) > 28 / 255) changed++;
    const frac = changed / (N * N);
    if (allowAdapt && frac < 0.03 && now - this.lastAdapt > 2000) {
      for (let i = 0; i < N * N; i++) this.ref[i] = this.ref[i] * 0.9 + this.cur[i] * 0.1;
      this.lastAdapt = now;
    }
    return frac;
  }
}
