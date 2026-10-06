import { type Rng, weightedPick } from "./rng";

export type PowerUpKind = "spread" | "rapid" | "shield" | "life";

export const POWERUP_DURATION_MS: Record<Exclude<PowerUpKind, "life">, number> = {
  spread: 8000,
  rapid: 8000,
  shield: 6000,
};

const DROP_CHANCE: Record<string, number> = { drone: 0.04, zigzag: 0.08, tank: 0.35 };

/** Decides whether a destroyed enemy drops a power-up, and which one. Extra lives are rare. */
export function rollDrop(enemy: string, rng: Rng): PowerUpKind | null {
  if (rng() >= (DROP_CHANCE[enemy] ?? 0)) return null;
  return weightedPick({ spread: 4, rapid: 4, shield: 3, life: 1 }, rng);
}

export interface WeaponState {
  spreadUntil: number;
  rapidUntil: number;
}

export function bulletAngles(state: WeaponState, now: number): number[] {
  return now < state.spreadUntil ? [-12, 0, 12] : [0];
}

export function fireCooldownMs(state: WeaponState, now: number): number {
  return now < state.rapidUntil ? 90 : 220;
}
