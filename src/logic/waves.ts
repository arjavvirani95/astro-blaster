import { type Rng, weightedPick } from "./rng";

export type EnemyKind = "drone" | "zigzag" | "tank";

export const ENEMIES: Record<EnemyKind, { hp: number; points: number; speed: number }> = {
  drone: { hp: 1, points: 100, speed: 120 },
  zigzag: { hp: 2, points: 250, speed: 150 },
  tank: { hp: 6, points: 600, speed: 70 },
};

export interface Spawn {
  kind: EnemyKind;
  x: number; // 0..1 of screen width
  delayMs: number;
}

export interface Wave {
  number: number;
  speedMultiplier: number;
  enemyFireChance: number; // per enemy per second
  spawns: Spawn[];
}

/**
 * Difficulty ramps on three axes: more enemies, a tougher mix, and faster/more aggressive enemies.
 * Every 5th wave is a "tank rush".
 */
export function buildWave(n: number, rng: Rng): Wave {
  const count = Math.min(6 + n * 2, 40);
  const isRush = n % 5 === 0;
  const weights: Record<EnemyKind, number> = isRush
    ? { drone: 1, zigzag: 1, tank: 3 }
    : { drone: Math.max(10 - n, 3), zigzag: Math.min(n, 6), tank: n >= 3 ? Math.min(n - 2, 3) : 0 };

  const gap = Math.max(900 - n * 50, 300);
  const spawns: Spawn[] = Array.from({ length: count }, (_, i) => ({
    kind: weightedPick(weights, rng),
    x: 0.08 + rng() * 0.84,
    delayMs: Math.round(i * gap + rng() * gap * 0.4),
  }));

  return {
    number: n,
    speedMultiplier: Math.min(1 + (n - 1) * 0.08, 2),
    enemyFireChance: Math.min(0.05 + n * 0.03, 0.5),
    spawns,
  };
}
