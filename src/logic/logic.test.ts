import { describe, expect, it } from "vitest";
import { bulletAngles, fireCooldownMs, rollDrop } from "./powerups";
import { seeded, weightedPick } from "./rng";
import { COMBO_WINDOW_MS, ScoreKeeper, isHighScore } from "./score";
import { buildWave } from "./waves";

describe("rng", () => {
  it("is deterministic", () => {
    const a = seeded(1), b = seeded(1);
    expect([a(), a(), a()]).toEqual([b(), b(), b()]);
  });
  it("weightedPick never picks zero-weight keys", () => {
    const rng = seeded(3);
    for (let i = 0; i < 500; i++) expect(weightedPick({ a: 1, b: 0 }, rng)).toBe("a");
  });
});

describe("buildWave", () => {
  it("ramps up enemy count and caps it", () => {
    expect(buildWave(1, seeded(1)).spawns).toHaveLength(8);
    expect(buildWave(4, seeded(1)).spawns).toHaveLength(14);
    expect(buildWave(50, seeded(1)).spawns).toHaveLength(40);
  });
  it("has no tanks in the first two waves", () => {
    for (const n of [1, 2]) expect(buildWave(n, seeded(n)).spawns.some((s) => s.kind === "tank")).toBe(false);
  });
  it("makes every 5th wave tank-heavy", () => {
    const tanks = buildWave(5, seeded(9)).spawns.filter((s) => s.kind === "tank").length;
    expect(tanks).toBeGreaterThan(5);
  });
  it("keeps spawns on screen and in order", () => {
    const { spawns } = buildWave(7, seeded(2));
    for (const s of spawns) expect(s.x).toBeGreaterThan(0.05), expect(s.x).toBeLessThan(0.95);
    expect(spawns.map((s) => s.delayMs)).toEqual([...spawns.map((s) => s.delayMs)].sort((a, b) => a - b));
  });
  it("caps speed", () => expect(buildWave(100, seeded(1)).speedMultiplier).toBe(2));
});

describe("ScoreKeeper", () => {
  it("builds combos within the window and applies the multiplier", () => {
    const s = new ScoreKeeper();
    for (let i = 0; i < 5; i++) s.kill(100, i * 100);
    expect(s.combo).toBe(5);
    expect(s.multiplier).toBe(2);
    expect(s.score).toBe(100 * 4 + 200);
  });
  it("resets the combo after the window or on hit", () => {
    const s = new ScoreKeeper();
    s.kill(100, 0);
    s.kill(100, COMBO_WINDOW_MS + 1);
    expect(s.combo).toBe(1);
    s.breakCombo();
    expect(s.combo).toBe(0);
  });
  it("tick expires stale combos", () => {
    const s = new ScoreKeeper();
    s.kill(100, 0);
    expect(s.tick(COMBO_WINDOW_MS + 10)).toBe(true);
    expect(s.combo).toBe(0);
  });
  it("detects high scores", () => {
    expect(isHighScore(10, null)).toBe(true);
    expect(isHighScore(10, 20)).toBe(false);
    expect(isHighScore(0, null)).toBe(false);
  });
});

describe("powerups", () => {
  it("tanks drop far more often than drones", () => {
    const rng = seeded(4);
    let tank = 0, drone = 0;
    for (let i = 0; i < 2000; i++) {
      if (rollDrop("tank", rng)) tank++;
      if (rollDrop("drone", rng)) drone++;
    }
    expect(tank).toBeGreaterThan(drone * 4);
  });
  it("changes weapon behaviour while active", () => {
    const st = { spreadUntil: 1000, rapidUntil: 0 };
    expect(bulletAngles(st, 500)).toHaveLength(3);
    expect(bulletAngles(st, 1500)).toEqual([0]);
    expect(fireCooldownMs(st, 500)).toBe(220);
  });
});
