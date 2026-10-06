import Phaser from "phaser";
import { COLORS } from "../config";

/** Draws every sprite procedurally, so the game ships with no image assets. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create() {
    const g = this.add.graphics();
    const tex = (key: string, w: number, h: number, draw: () => void) => {
      g.clear();
      draw();
      g.generateTexture(key, w, h);
    };

    tex("ship", 36, 40, () => {
      g.fillStyle(COLORS.player).fillTriangle(18, 0, 0, 36, 36, 36);
      g.fillStyle(0x0ea5e9).fillTriangle(18, 12, 10, 34, 26, 34);
      g.fillStyle(0xfb923c).fillRect(12, 36, 12, 4);
    });
    tex("bullet", 4, 14, () => g.fillStyle(COLORS.bullet).fillRect(0, 0, 4, 14));
    tex("ebullet", 8, 8, () => g.fillStyle(COLORS.enemyBullet).fillCircle(4, 4, 4));
    tex("drone", 28, 22, () => {
      g.fillStyle(COLORS.drone).fillRoundedRect(0, 4, 28, 14, 6);
      g.fillStyle(0x0f172a).fillCircle(9, 11, 3).fillCircle(19, 11, 3);
    });
    tex("zigzag", 30, 30, () => {
      g.fillStyle(COLORS.zigzag).fillTriangle(15, 30, 0, 0, 30, 0);
      g.fillStyle(0x0f172a).fillCircle(15, 10, 4);
    });
    tex("tank", 48, 40, () => {
      g.fillStyle(COLORS.tank).fillRoundedRect(0, 0, 48, 34, 8);
      g.fillStyle(0x7c2d12).fillRect(20, 30, 8, 10);
      g.fillStyle(0x0f172a).fillRect(8, 10, 32, 8);
    });
    for (const kind of ["spread", "rapid", "shield", "life"] as const) {
      tex(`pu-${kind}`, 22, 22, () => {
        g.lineStyle(2, 0xffffff).strokeCircle(11, 11, 10);
        g.fillStyle(COLORS[kind]).fillCircle(11, 11, 8);
      });
    }
    tex("spark", 4, 4, () => g.fillStyle(0xffffff).fillRect(0, 0, 4, 4));
    tex("star", 2, 2, () => g.fillStyle(0xffffff).fillRect(0, 0, 2, 2));
    g.destroy();

    this.scene.start("menu");
  }
}
