export const COMBO_WINDOW_MS = 1500;
export const MAX_MULTIPLIER = 5;

/** Kills in quick succession build a combo; the multiplier grows by 1 every 5 combo kills. */
export class ScoreKeeper {
  score = 0;
  combo = 0;
  bestCombo = 0;
  private lastKillAt = -Infinity;

  get multiplier(): number {
    return Math.min(1 + Math.floor(this.combo / 5), MAX_MULTIPLIER);
  }

  kill(points: number, now: number): number {
    this.combo = now - this.lastKillAt <= COMBO_WINDOW_MS ? this.combo + 1 : 1;
    this.lastKillAt = now;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const gained = points * this.multiplier;
    this.score += gained;
    return gained;
  }

  /** Called when the player is hit. */
  breakCombo(): void {
    this.combo = 0;
    this.lastKillAt = -Infinity;
  }

  /** Returns true when `now` is past the combo window, resetting the combo. */
  tick(now: number): boolean {
    if (this.combo > 0 && now - this.lastKillAt > COMBO_WINDOW_MS) {
      this.combo = 0;
      return true;
    }
    return false;
  }
}

export function isHighScore(score: number, best: number | null): boolean {
  return score > 0 && (best === null || score > best);
}
