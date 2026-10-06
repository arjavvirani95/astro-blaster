import Phaser from "phaser";

/** Three parallax layers of stars scrolling at different speeds. */
export class Starfield {
  private stars: { img: Phaser.GameObjects.Image; speed: number }[] = [];

  constructor(private scene: Phaser.Scene, count = 90) {
    const { width, height } = scene.scale;
    for (let i = 0; i < count; i++) {
      const layer = i % 3;
      const img = scene.add
        .image(Phaser.Math.Between(0, width), Phaser.Math.Between(0, height), "star")
        .setAlpha(0.3 + layer * 0.3)
        .setScale(layer === 2 ? 1.5 : 1)
        .setDepth(-10);
      this.stars.push({ img, speed: 20 + layer * 45 });
    }
  }

  update(deltaMs: number) {
    const h = this.scene.scale.height;
    for (const s of this.stars) {
      s.img.y += (s.speed * deltaMs) / 1000;
      if (s.img.y > h) {
        s.img.y = 0;
        s.img.x = Phaser.Math.Between(0, this.scene.scale.width);
      }
    }
  }
}
