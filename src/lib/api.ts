import { supabase } from './supabase';
import type { Material } from './points';

export interface Profile {
  id: string;
  phone: string;
  name: string;
  building: string;
  points: number;
  created_at: string;
}
export interface Session {
  id: string;
  machine_id: string;
  user_id: string;
  display_name: string | null;
  status: 'active' | 'ended';
  pet_count: number;
  can_count: number;
  rejected_count: number;
  points: number;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
}
export interface Deposit {
  id: number;
  session_id: string | null;
  user_id: string | null;
  machine_id: string;
  material: Material;
  points: number;
  client_event_id: string | null;
  created_at: string;
}
export interface Machine {
  id: string;
  name: string;
  building: string;
  location: string | null;
  fill_count: number;
  capacity: number;
  fill_level: number;
  status: string;
  updated_at: string;
}
export interface Reward {
  id: string;
  title: string;
  category: 'refill' | 'voucher' | 'cafe';
  cost_points: number;
  vnd_value: number | null;
  note: string | null;
  detail: string | null;
  emoji: string | null;
  sort: number;
  active: boolean;
}
export interface Redemption {
  id: string;
  user_id: string;
  reward_id: string;
  points: number;
  code: string;
  status: string;
  created_at: string;
}
export interface Pickup {
  id: number;
  machine_id: string;
  partner: string;
  weight_kg: number | null;
  batch_code: string | null;
  status: 'scheduled' | 'collected' | 'verified';
  picked_at: string;
}
export type HistoryItem =
  | { kind: 'deposit'; id: string; at: string; machine_id: string; pet: number; can: number; rejected: number; points: number }
  | { kind: 'redeem'; id: string; at: string; title: string; emoji: string | null; code: string; points: number };
export interface Journey {
  status: 'ok';
  machine: Machine;
  partner: string;
  my_containers_in_batch: number;
  building_month_total: number;
  last_collected_at: string | null;
  pickups: Pickup[];
  next_pickup: Pickup | null;
}
export interface Me {
  status: 'ok';
  profile: Profile;
  stats: { pet: number; can: number; sessions: number; redemptions: number };
  active_session: Session | null;
}
export interface StartSessionResult {
  status: 'ok' | 'busy' | 'no_machine' | 'no_user';
  message?: string;
  session?: Session;
  balance?: number;
  machine?: { id: string; name: string; building: string; fill_level: number };
}
export interface RecordDepositResult {
  status: 'ok' | 'rejected' | 'no_session' | 'unauthorized' | 'bad_material' | 'duplicate' | 'too_fast';
  points_added?: number;
  session?: Session;
  balance?: number;
  deposit_id?: number;
}
export interface RedeemResult {
  status: 'ok' | 'insufficient' | 'no_reward';
  redemption?: Redemption;
  reward?: Reward;
  balance?: number;
  needed?: number;
}

export class ApiError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
  }
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const msg = error.message?.includes('invalid_phone')
      ? 'Please enter a valid phone number (9–11 digits).'
      : error.message || 'Something went wrong. Please try again.';
    throw new ApiError(msg, error.code);
  }
  return data as T;
}

export const api = {
  loginWithPhone: (phone: string, name: string) => rpc<Profile>('login_with_phone', { phone, name }),
  startSession: (userId: string, machineId: string) =>
    rpc<StartSessionResult>('start_session', { user_id: userId, machine_id: machineId }),
  endSession: (sessionId: string) =>
    rpc<{ status: 'ok' | 'no_session'; session?: Session; balance?: number }>('end_session', { session_id: sessionId }),
  recordDeposit: (machineId: string, machineKey: string, material: Material, clientEventId?: string) =>
    rpc<RecordDepositResult>('record_deposit', {
      machine_id: machineId,
      machine_key: machineKey,
      material,
      client_event_id: clientEventId ?? null,
    }),
  redeemReward: (userId: string, rewardId: string) =>
    rpc<RedeemResult>('redeem_reward', { user_id: userId, reward_id: rewardId }),
  getMe: (userId: string) => rpc<Me | { status: 'no_user' }>('get_me', { user_id: userId }),
  getHistory: (userId: string) => rpc<HistoryItem[]>('get_history', { user_id: userId }),
  getJourney: (userId: string, machineId = 'SG-SUN-01') =>
    rpc<Journey | { status: 'no_machine' }>('get_journey', { user_id: userId, machine_id: machineId }),

  async listRewards(): Promise<Reward[]> {
    const { data, error } = await supabase.from('rewards').select('*').eq('active', true).order('sort');
    if (error) throw new ApiError(error.message);
    return data as Reward[];
  },
  async getReward(id: string): Promise<Reward | null> {
    const { data, error } = await supabase.from('rewards').select('*').eq('id', id).maybeSingle();
    if (error) throw new ApiError(error.message);
    return data as Reward | null;
  },
  async getMachine(id: string): Promise<Machine | null> {
    const { data, error } = await supabase
      .from('machines')
      .select('id,name,building,location,fill_count,capacity,fill_level,status,updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new ApiError(error.message);
    return data as Machine | null;
  },
  async listMachines(): Promise<Machine[]> {
    const { data, error } = await supabase
      .from('machines')
      .select('id,name,building,location,fill_count,capacity,fill_level,status,updated_at')
      .order('id');
    if (error) throw new ApiError(error.message);
    return data as Machine[];
  },
  async getSession(id: string): Promise<Session | null> {
    const { data, error } = await supabase.from('sessions').select('*').eq('id', id).maybeSingle();
    if (error) throw new ApiError(error.message);
    return data as Session | null;
  },
  async getActiveSession(machineId: string): Promise<Session | null> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('machine_id', machineId)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new ApiError(error.message);
    return data as Session | null;
  },
  async listDeposits(sessionId: string): Promise<Deposit[]> {
    const { data, error } = await supabase.from('deposits').select('*').eq('session_id', sessionId).order('id');
    if (error) throw new ApiError(error.message);
    return data as Deposit[];
  },
  async listMachineDeposits(machineId: string, limit = 20): Promise<Deposit[]> {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('machine_id', machineId)
      .order('id', { ascending: false })
      .limit(limit);
    if (error) throw new ApiError(error.message);
    return data as Deposit[];
  },
};
