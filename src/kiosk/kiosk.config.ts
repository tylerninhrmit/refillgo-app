export const KIOSK = {
  /** Detection thresholds (see logic/depositMachine.ts) */
  confThreshold: 0.5,
  meanConfThreshold: 0.6,
  classAgreement: 0.7,
  minConfidentFrames: 4,
  minPresenceMs: 350,
  hintAfterMs: 1500,
  uncertainRejectMs: 3500,
  absentMs: 500,
  cooldownMs: 400,
  minCreditGapMs: 2000,
  presenceEnter: 0.06,
  presenceExit: 0.03,
  /** Session housekeeping */
  idleTimeoutMs: 90_000,
  summaryMs: 8_000,
  /** Machine */
  capacity: 400,
  points: { pet: 10, can: 15 } as const,
  demoUserId: '00000000-0000-4000-8000-000000000001',
};

export type KioskClass = 'pet' | 'can' | 'other';

/** Maps raw model class names (any of the supported public models) to kiosk classes. */
const CAN_NAMES = ['aluminum_soda_cans', 'aluminum_can', 'aluminium_can', 'aluminum can', 'aluminium can', 'tin', 'drink can', 'food can', 'alucan', 'cans', 'can', 'metal'];
const PET_NAMES = ['plastic_soda_bottles', 'plastic_water_bottles', 'plastic_bottle', 'plastic bottle', 'clear plastic bottle', 'other plastic bottle', 'pet', 'bottle', 'plastic'];

export function mapClassName(name: string): KioskClass {
  const n = name.trim().toLowerCase().replace(/[-\s]+/g, '_');
  if (CAN_NAMES.some((c) => n === c.replace(/[-\s]+/g, '_'))) return 'can';
  if (PET_NAMES.some((c) => n === c.replace(/[-\s]+/g, '_'))) return 'pet';
  return 'other';
}
