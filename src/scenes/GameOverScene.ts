import Phaser from "phaser";
import { TEXT_STYLE } from "../config";
import { isHighScore } from "../logic/score";
import { loadBest, saveBest } from "../storage";
import { Starfield } from "./Starfield";

interface Result {
  score: number;
  wave: number;
  bestCombo: number;
}

export class GameOverScene extends Phaser.Scene {
  private stars!: Starfield;

  constructor() {
    super("gameover");
  }

  create({ score, wave, bestCombo }: Result) {
    const { width, height } = this.scale;
    this.stars = new Starfield(this);
    const best = loadBest();
    const record = isHighScore(score, best);
    if (record) saveBest(score);

    this.add.text(width / 2, height * 0.28, "GAME OVER", { ...TEXT_STYLE, fontSize: "44px", color: "#f43f5e" }).setOrigin(0.5);
    this.add.text(width / 2, height * 0.4, score.toLocaleString(), { ...TEXT_STYLE, fontSize: "40px" }).setOrigin(0.5);
    if (record) {
      const banner = this.add.text(width / 2, height * 0.47, "NEW HIGH SCORE!", { ...TEXT_STYLE, fontSize: "20px", color: "#fde047" }).setOrigin(0.5);
      this.tweens.add({ targets: banner, scale: 1.15, duration: 400, yoyo: true, repeat: -1 });
    } else if (best) {
      this.add.text(width / 2, height * 0.47, `BEST ${best.toLocaleString()}`, { ...TEXT_STYLE, fontSize: "18px", color: "#94a3b8" }).setOrigin(0.5);
    }
    this.add.text(width / 2, height * 0.56, `REACHED WAVE ${wave}\nBEST COMBO ${bestCombo}`, {
      ...TEXT_STYLE, fontSize: "18px", align: "center", color: "#94a3b8",
    }).setOrigin(0.5);

    const prompt = this.add.text(width / 2, height * 0.72, "SPACE / TAP TO PLAY AGAIN", { ...TEXT_STYLE, fontSize: "18px" }).setOrigin(0.5);
    this.tweens.add({ targets: prompt, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });

    // Short delay so a held fire key doesn't skip this screen.
    this.time.delayedCall(600, () => {
      this.input.keyboard?.once("keydown-SPACE", () => this.scene.start("game"));
      this.input.once("pointerdown", () => this.scene.start("game"));
    });
  }

  update(_t: number, dt: number) {
    this.stars.update(dt);
  }
}
