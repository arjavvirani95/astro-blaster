import Phaser from "phaser";
import { TEXT_STYLE } from "../config";
import { loadBest } from "../storage";
import { Starfield } from "./Starfield";

export class MenuScene extends Phaser.Scene {
  private stars!: Starfield;

  constructor() {
    super("menu");
  }

  create() {
    const { width, height } = this.scale;
    this.stars = new Starfield(this);

    this.add.text(width / 2, height * 0.3, "ASTRO\nBLASTER", { ...TEXT_STYLE, fontSize: "56px", align: "center", color: "#38bdf8" })
      .setOrigin(0.5);
    const best = loadBest();
    if (best) this.add.text(width / 2, height * 0.45, `BEST ${best.toLocaleString()}`, { ...TEXT_STYLE, fontSize: "20px" }).setOrigin(0.5);

    const prompt = this.add
      .text(width / 2, height * 0.62, this.sys.game.device.input.touch ? "TAP TO START" : "PRESS SPACE TO START", {
        ...TEXT_STYLE, fontSize: "20px",
      })
      .setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    this.add.text(width / 2, height * 0.85, "MOVE: ARROWS / WASD / DRAG\nFIRE: SPACE (AUTO ON TOUCH)\nPAUSE: P", {
      ...TEXT_STYLE, fontSize: "14px", align: "center", color: "#94a3b8",
    }).setOrigin(0.5);

    const start = () => this.scene.start("game");
    this.input.keyboard?.once("keydown-SPACE", start);
    this.input.once("pointerdown", start);
  }

  update(_t: number, dt: number) {
    this.stars.update(dt);
  }
}
