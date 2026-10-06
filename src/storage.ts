const KEY = "astro-blaster:best";

export function loadBest(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}

export function saveBest(score: number): void {
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    // Private mode or storage disabled: the high score just won't persist.
  }
}
