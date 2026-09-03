import { KIOSK, type KioskClass } from '../kiosk.config';

export interface Box { cls: KioskClass; conf: number; x1: number; y1: number; x2: number; y2: number }
export interface Observation { t: number; boxes: Box[]; presence: number }

export type Phase = 'NO_SESSION' | 'READY' | 'CANDIDATE' | 'CREDITED' | 'REJECTED' | 'COOLDOWN';

export interface MachineState {
  phase: Phase;
  hasSession: boolean;
  candidateSince: number | null;
  absentSince: number | null;
  votes: { cls: KioskClass; conf: number }[];
  lastCreditAt: number;
  phaseSince: number;
  hint: string | null;
}

export type Effect =
  | { type: 'credit'; material: 'pet' | 'can' }
  | { type: 'reject'; reason: 'other' | 'uncertain' }
  | { type: 'hint'; text: string | null };

export function initialState(hasSession = false): MachineState {
  return {
    phase: hasSession ? 'READY' : 'NO_SESSION',
    hasSession,
    candidateSince: null,
    absentSince: null,
    votes: [],
    lastCreditAt: -Infinity,
    phaseSince: 0,
    hint: null,
  };
}

export function setSessionActive(state: MachineState, hasSession: boolean, now: number): MachineState {
  if (state.hasSession === hasSession) return state;
  return { ...initialState(hasSession), lastCreditAt: state.lastCreditAt, phaseSince: now };
}

function isPresent(obs: Observation, state: MachineState): boolean {
  const boxed = obs.boxes.some((b) => b.conf >= 0.25);
  const thr = state.phase === 'READY' || state.phase === 'COOLDOWN' ? KIOSK.presenceEnter : KIOSK.presenceExit;
  return boxed || obs.presence >= thr;
}

/** Pure reducer: one physical item → exactly one credit. */
export function reduce(state: MachineState, obs: Observation, now: number): { state: MachineState; effects: Effect[] } {
  const effects: Effect[] = [];
  const present = isPresent(obs, state);
  let s: MachineState = { ...state };
  if (present) s.absentSince = null;
  else if (s.absentSince === null) s.absentSince = now;
  const absentFor = s.absentSince === null ? 0 : now - s.absentSince;

  switch (s.phase) {
    case 'NO_SESSION': {
      const hint = present ? 'Scan the QR code first, then drop your bottle or can' : null;
      if (hint !== s.hint) {
        s.hint = hint;
        effects.push({ type: 'hint', text: hint });
      }
      return { state: s, effects };
    }
    case 'READY': {
      if (present) {
        s = { ...s, phase: 'CANDIDATE', candidateSince: now, phaseSince: now, votes: [] };
      }
      break;
    }
    case 'CANDIDATE': {
      if (!present && absentFor >= KIOSK.absentMs) {
        s = { ...s, phase: 'READY', candidateSince: null, votes: [], phaseSince: now, hint: null };
        effects.push({ type: 'hint', text: null });
        break;
      }
      const top = obs.boxes.filter((b) => b.conf >= KIOSK.confThreshold).sort((a, b) => b.conf - a.conf)[0];
      if (top) s.votes = [...s.votes.slice(-15), { cls: top.cls, conf: top.conf }];
      const presentFor = now - (s.candidateSince ?? now);
      const decision = decide(s.votes);
      if (presentFor >= KIOSK.minPresenceMs && decision) {
        if (decision === 'other') {
          s = { ...s, phase: 'REJECTED', phaseSince: now, hint: null };
          effects.push({ type: 'reject', reason: 'other' }, { type: 'hint', text: null });
        } else if (now - s.lastCreditAt >= KIOSK.minCreditGapMs) {
          s = { ...s, phase: 'CREDITED', phaseSince: now, lastCreditAt: now, hint: null };
          effects.push({ type: 'credit', material: decision }, { type: 'hint', text: null });
        }
      } else if (presentFor >= KIOSK.uncertainRejectMs) {
        s = { ...s, phase: 'REJECTED', phaseSince: now, hint: null };
        effects.push({ type: 'reject', reason: 'uncertain' }, { type: 'hint', text: null });
      } else if (presentFor >= KIOSK.hintAfterMs && s.hint === null) {
        s.hint = 'Place the item flat in the tray';
        effects.push({ type: 'hint', text: s.hint });
      }
      break;
    }
    case 'CREDITED':
    case 'REJECTED': {
      if (!present && absentFor >= KIOSK.absentMs) s = { ...s, phase: 'COOLDOWN', phaseSince: now, votes: [], candidateSince: null };
      break;
    }
    case 'COOLDOWN': {
      if (now - s.phaseSince >= KIOSK.cooldownMs) s = { ...s, phase: 'READY', phaseSince: now };
      break;
    }
  }
  return { state: s, effects };
}

function decide(votes: { cls: KioskClass; conf: number }[]): KioskClass | null {
  if (votes.length < KIOSK.minConfidentFrames) return null;
  const counts: Record<KioskClass, number> = { pet: 0, can: 0, other: 0 };
  const confs: Record<KioskClass, number[]> = { pet: [], can: [], other: [] };
  votes.forEach((v) => {
    counts[v.cls]++;
    confs[v.cls].push(v.conf);
  });
  const winner = (Object.keys(counts) as KioskClass[]).sort((a, b) => counts[b] - counts[a])[0];
  const share = counts[winner] / votes.length;
  const mean = confs[winner].reduce((a, b) => a + b, 0) / Math.max(1, confs[winner].length);
  if (counts[winner] >= KIOSK.minConfidentFrames && share >= KIOSK.classAgreement && mean >= KIOSK.meanConfThreshold) return winner;
  return null;
}
