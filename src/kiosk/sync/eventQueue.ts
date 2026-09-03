import { api, type RecordDepositResult } from '../../lib/api';
import type { Material } from '../../lib/points';

export interface QueuedEvent { id: string; machineId: string; material: Material; at: number; tries: number }

const KEY = (machineId: string) => `refillgo:kiosk:queue:${machineId}`;

/** localStorage-backed retry queue so a Wi-Fi drop never loses a credit (server is idempotent on id). */
export class EventQueue {
  private items: QueuedEvent[] = [];
  private timer: number | null = null;
  private flushing = false;
  private listeners = new Set<(n: number) => void>();

  constructor(private machineId: string, private key: string, private onResult: (ev: QueuedEvent, res: RecordDepositResult) => void) {
    try {
      this.items = JSON.parse(localStorage.getItem(KEY(machineId)) ?? '[]');
    } catch {
      this.items = [];
    }
    window.addEventListener('online', () => this.flush());
    if (this.items.length) this.schedule(500);
  }

  get size() {
    return this.items.length;
  }
  subscribe(fn: (n: number) => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  private persist() {
    localStorage.setItem(KEY(this.machineId), JSON.stringify(this.items));
    this.listeners.forEach((l) => l(this.items.length));
  }

  /** Submit immediately; queue on network failure. Returns the RPC result when sent synchronously. */
  async submit(material: Material): Promise<RecordDepositResult | null> {
    const ev: QueuedEvent = { id: crypto.randomUUID(), machineId: this.machineId, material, at: Date.now(), tries: 0 };
    try {
      const res = await api.recordDeposit(this.machineId, this.key, material, ev.id);
      this.onResult(ev, res);
      return res;
    } catch {
      this.items.push(ev);
      this.persist();
      this.schedule(1000);
      return null;
    }
  }

  private schedule(ms: number) {
    if (this.timer !== null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      void this.flush();
    }, ms);
  }

  async flush() {
    if (this.flushing || !this.items.length) return;
    this.flushing = true;
    try {
      while (this.items.length) {
        const ev = this.items[0];
        try {
          const res = await api.recordDeposit(ev.machineId, this.key, ev.material, ev.id);
          this.items.shift();
          this.persist();
          this.onResult(ev, res);
        } catch {
          ev.tries++;
          this.persist();
          this.schedule(Math.min(15000, 1000 * 2 ** Math.min(ev.tries, 4)));
          break;
        }
      }
    } finally {
      this.flushing = false;
    }
  }
}
