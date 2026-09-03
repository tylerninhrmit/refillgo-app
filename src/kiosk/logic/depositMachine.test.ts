import { describe, expect, it } from 'vitest';
import { initialState, reduce, setSessionActive, type Observation, type Effect } from './depositMachine';
import type { KioskClass } from '../kiosk.config';

const obs = (t: number, cls: KioskClass | null, conf = 0.9, presence = cls ? 0.3 : 0): Observation => ({
  t,
  presence,
  boxes: cls ? [{ cls, conf, x1: 10, y1: 10, x2: 100, y2: 100 }] : [],
});

function run(seq: Observation[], hasSession = true) {
  let state = initialState(hasSession);
  const effects: Effect[] = [];
  for (const o of seq) {
    const r = reduce(state, o, o.t);
    state = r.state;
    effects.push(...r.effects);
  }
  return { state, effects };
}

const credits = (e: Effect[]) => e.filter((x) => x.type === 'credit');
const rejects = (e: Effect[]) => e.filter((x) => x.type === 'reject');

describe('depositMachine', () => {
  it('credits exactly once for a can held in the tray', () => {
    const seq: Observation[] = [];
    for (let t = 0; t < 1200; t += 50) seq.push(obs(t, 'can'));
    for (let t = 1200; t < 2500; t += 50) seq.push(obs(t, null));
    const { effects, state } = run(seq);
    expect(credits(effects)).toEqual([{ type: 'credit', material: 'can' }]);
    expect(state.phase).toBe('READY');
  });

  it('ignores a hand passing through (< 350 ms)', () => {
    const seq = [obs(0, 'other'), obs(100, 'other'), obs(200, 'other'), obs(300, null), obs(900, null), obs(1500, null)];
    const { effects } = run(seq);
    expect(credits(effects)).toHaveLength(0);
    expect(rejects(effects)).toHaveLength(0);
  });

  it('rejects a glass jar', () => {
    const seq: Observation[] = [];
    for (let t = 0; t < 1000; t += 50) seq.push(obs(t, 'other'));
    const { effects } = run(seq);
    expect(rejects(effects)[0]).toEqual({ type: 'reject', reason: 'other' });
    expect(credits(effects)).toHaveLength(0);
  });

  it('does not double-credit when detections flicker while the item stays', () => {
    const seq: Observation[] = [];
    for (let t = 0; t < 3000; t += 50) seq.push(obs(t, t % 300 < 150 ? 'pet' : null, 0.8, 0.2));
    const { effects } = run(seq);
    expect(credits(effects)).toHaveLength(1);
  });

  it('credits two items dropped one after another', () => {
    const seq: Observation[] = [];
    for (let t = 0; t < 800; t += 50) seq.push(obs(t, 'pet'));
    for (let t = 800; t < 1500; t += 50) seq.push(obs(t, null));
    for (let t = 2600; t < 3400; t += 50) seq.push(obs(t, 'can'));
    for (let t = 3400; t < 4200; t += 50) seq.push(obs(t, null));
    const { effects } = run(seq);
    expect(credits(effects).map((c) => (c as { material: string }).material)).toEqual(['pet', 'can']);
  });

  it('never credits without a session', () => {
    const seq: Observation[] = [];
    for (let t = 0; t < 1200; t += 50) seq.push(obs(t, 'can'));
    const { effects } = run(seq, false);
    expect(credits(effects)).toHaveLength(0);
    expect(effects.some((e) => e.type === 'hint' && e.text)).toBe(true);
  });

  it('rejects an uncertain item after 3.5 s', () => {
    const seq: Observation[] = [];
    for (let t = 0; t < 4000; t += 50) seq.push(obs(t, 'pet', 0.35, 0.2)); // low confidence
    const { effects } = run(seq);
    expect(rejects(effects)[0]).toEqual({ type: 'reject', reason: 'uncertain' });
  });

  it('re-arms when a session starts', () => {
    const s = setSessionActive(initialState(false), true, 100);
    expect(s.phase).toBe('READY');
  });
});
