// Single source of truth on the client — mirrors public.points_for() in Supabase.
export const POINTS = { pet: 10, can: 15 } as const;
export const VND_PER_POINT = 25; // demo conversion: 1 Green Point ≈ 25 đ refill value
export const CO2_G = { pet: 28, can: 46 } as const; // estimate for demo purposes — to be sourced for the report

export type Material = 'pet' | 'can' | 'rejected';

export const MATERIAL_LABEL: Record<Material, string> = {
  pet: 'PET bottle',
  can: 'Aluminium can',
  rejected: 'Item not accepted',
};

export function pointsFor(material: Material): number {
  return material === 'pet' ? POINTS.pet : material === 'can' ? POINTS.can : 0;
}

export function toVnd(points: number): number {
  return points * VND_PER_POINT;
}

export function co2Kg(pet: number, can: number): number {
  return (pet * CO2_G.pet + can * CO2_G.can) / 1000;
}
