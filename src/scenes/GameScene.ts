import Phaser from "phaser";
import { COLORS, INVULNERABLE_MS, PLAYER_SPEED, START_LIVES, TEXT_STYLE } from "../config";
import { POWERUP_DURATION_MS, bulletAngles, fireCooldownMs, rollDrop, type PowerUpKind, type WeaponState } from "../logic/powerups";
import { seeded, type Rng } from "../logic/rng";
import { ScoreKeeper } from "../logic/score";
import { ENEMIES, buildWave, type EnemyKind } from "../logic/waves";
import { Starfield } from "./Starfield";

type Sprite = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;

export class GameScene extends Phaser.Scene {
  private player!: Sprite;
  private bullets!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private powerups!: Phaser.Physics.Arcade.Group;
  private stars!: Starfield;
  private sparks!: Phaser.GameObjects.Particles.ParticleEmitter;
  private shieldRing!: Phaser.GameObjects.Arc;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"W" | "A" | "S" | "D", Phaser.Input.Keyboard.Key>;
  private fireKey!: Phaser.Input.Keyboard.Key;
  private dragTarget: Phaser.Math.Vector2 | null = null;

  private hud!: { score: Phaser.GameObjects.Text; lives: Phaser.GameObjects.Text; combo: Phaser.GameObjects.Text; wave: Phaser.GameObjects.Text };

  private rng!: Rng;
  private score!: ScoreKeeper;
  private lives = START_LIVES;
  private waveNumber = 0;
  private pendingSpawns = 0;
  private weapon: WeaponState = { spreadUntil: 0, rapidUntil: 0 };
  private shieldUntil = 0;
  private invulnerableUntil = 0;
  private nextFireAt = 0;
  private enemyFireChance = 0;
  private speedMultiplier = 1;
  private over = false;

  constructor() {
    super("game");
  }

  create() {
    const { width, height } = this.scale;
    this.rng = seeded(Date.now());
    this.score = new ScoreKeeper();
    this.lives = START_LIVES;
    this.waveNumber = 0;
    this.weapon = { spreadUntil: 0, rapidUntil: 0 };
    this.shieldUntil = this.invulnerableUntil = this.nextFireAt = 0;
    this.over = false;

    this.stars = new Starfield(this);
    this.player = this.physics.add.sprite(width / 2, height - 90, "ship").setCollideWorldBounds(true);
    this.player.body.setSize(24, 28);
    this.shieldRing = this.add.circle(0, 0, 30).setStrokeStyle(2, COLORS.shield).setVisible(false);

    const groupOpts = { maxSize: 200, runChildUpdate: false };
    this.bullets = this.physics.add.group({ defaultKey: "bullet", ...groupOpts });
    this.enemyBullets = this.physics.add.group({ defaultKey: "ebullet", ...groupOpts });
    this.enemies = this.physics.add.group();
    this.powerups = this.physics.add.group();

    this.sparks = this.add.particles(0, 0, "spark", {
      speed: { min: 60, max: 260 }, lifespan: 450, scale: { start: 1.4, end: 0 }, emitting: false,
    });

    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => this.hitEnemy(b as Sprite, e as Sprite));
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
      (b as Sprite).disableBody(true, true);
      this.hitPlayer();
    });
    this.physics.add.overlap(this.player, this.enemies, (_p, e) => {
      this.explode(e as Sprite);
      this.hitPlayer();
    });
    this.physics.add.overlap(this.player, this.powerups, (_p, pu) => this.collect(pu as Sprite));

    this.setupInput();
    this.setupHud();
    this.nextWave();
  }

  private setupInput() {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys("W,A,S,D") as typeof this.wasd;
    this.fireKey = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    kb.on("keydown-P", () => this.togglePause());
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => (this.dragTarget = new Phaser.Math.Vector2(p.x, p.y - 60)));
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => p.isDown && this.dragTarget?.set(p.x, p.y - 60));
    this.input.on("pointerup", () => (this.dragTarget = null));
  }

  private setupHud() {
    const style = { ...TEXT_STYLE, fontSize: "18px" };
    this.hud = {
      score: this.add.text(12, 10, "", style).setDepth(10),
      lives: this.add.text(this.scale.width - 12, 10, "", style).setOrigin(1, 0).setDepth(10),
      combo: this.add.text(12, 34, "", { ...style, fontSize: "14px", color: "#fde047" }).setDepth(10),
      wave: this.add.text(this.scale.width / 2, this.scale.height / 2, "", { ...style, fontSize: "32px" }).setOrigin(0.5).setDepth(10),
    };
    this.refreshHud();
  }

  private refreshHud() {
    this.hud.score.setText(this.score.score.toLocaleString().padStart(7, " "));
    this.hud.lives.setText("♥".repeat(Math.max(this.lives, 0)));
    this.hud.combo.setText(this.score.combo >= 2 ? `COMBO ${this.score.combo}  x${this.score.multiplier}` : "");
  }

  private togglePause() {
    if (this.over) return;
    if (this.physics.world.isPaused) {
      this.physics.resume();
      this.time.paused = false;
      this.hud.wave.setText("");
    } else {
      this.physics.pause();
      this.time.paused = true;
      this.hud.wave.setText("PAUSED").setAlpha(1);
    }
  }

  // ---------------------------------------------------------------- waves

  private nextWave() {
    this.waveNumber++;
    const wave = buildWave(this.waveNumber, this.rng);
    this.speedMultiplier = wave.speedMultiplier;
    this.enemyFireChance = wave.enemyFireChance;
    this.pendingSpawns = wave.spawns.length;

    this.hud.wave.setText(this.waveNumber % 5 === 0 ? `WAVE ${this.waveNumber}\nTANK RUSH` : `WAVE ${this.waveNumber}`).setAlpha(1);
    this.hud.wave.setAlign("center");
    this.tweens.add({ targets: this.hud.wave, alpha: 0, delay: 1200, duration: 500 });

    for (const s of wave.spawns) {
      this.time.delayedCall(1500 + s.delayMs, () => {
        this.pendingSpawns--;
        if (!this.over) this.spawnEnemy(s.kind, s.x * this.scale.width);
      });
    }
  }

  private spawnEnemy(kind: EnemyKind, x: number) {
    const e = this.enemies.create(x, -30, kind) as Sprite;
    e.setData({ kind, hp: ENEMIES[kind].hp, born: this.time.now, originX: x });
    e.setVelocityY(ENEMIES[kind].speed * this.speedMultiplier);
  }

  // --------------------------------------------------------------- combat

  private fire(now: number) {
    if (now < this.nextFireAt) return;
    this.nextFireAt = now + fireCooldownMs(this.weapon, now);
    for (const angle of bulletAngles(this.weapon, now)) {
      const b = this.bullets.get(this.player.x, this.player.y - 22) as Sprite | null;
      if (!b) continue;
      b.enableBody(true, this.player.x, this.player.y - 22, true, true);
      b.setAngle(angle);
      this.physics.velocityFromAngle(angle - 90, 620, b.body.velocity);
    }
  }

  private hitEnemy(bullet: Sprite, enemy: Sprite) {
    bullet.disableBody(true, true);
    const hp = enemy.getData("hp") - 1;
    enemy.setData("hp", hp);
    if (hp > 0) {
      enemy.setTintFill(0xffffff);
      this.time.delayedCall(60, () => enemy.active && enemy.clearTint());
      return;
    }
    const kind = enemy.getData("kind") as EnemyKind;
    const gained = this.score.kill(ENEMIES[kind].points, this.time.now);
    this.floatText(enemy.x, enemy.y, `+${gained}`);
    const drop = rollDrop(kind, this.rng);
    if (drop) this.dropPowerUp(drop, enemy.x, enemy.y);
    this.explode(enemy);
    this.refreshHud();
  }

  private explode(enemy: Sprite) {
    const kind = enemy.getData("kind") as EnemyKind;
    this.sparks.setParticleTint(COLORS[kind]);
    this.sparks.explode(kind === "tank" ? 28 : 14, enemy.x, enemy.y);
    if (kind === "tank") this.cameras.main.shake(120, 0.006);
    enemy.destroy();
  }

  private hitPlayer() {
    const now = this.time.now;
    if (this.over || now < this.invulnerableUntil) return;
    if (now < this.shieldUntil) {
      this.shieldUntil = 0;
      this.invulnerableUntil = now + 500;
      return;
    }
    this.lives--;
    this.score.breakCombo();
    this.cameras.main.shake(200, 0.012);
    this.sparks.setParticleTint(COLORS.player);
    this.sparks.explode(24, this.player.x, this.player.y);
    this.refreshHud();
    if (this.lives <= 0) return this.gameOver();
    this.invulnerableUntil = now + INVULNERABLE_MS;
    this.tweens.add({ targets: this.player, alpha: 0.2, duration: 120, yoyo: true, repeat: Math.floor(INVULNERABLE_MS / 240) });
  }

  private dropPowerUp(kind: PowerUpKind, x: number, y: number) {
    const pu = this.powerups.create(x, y, `pu-${kind}`) as Sprite;
    pu.setData("kind", kind).setVelocityY(110);
    this.tweens.add({ targets: pu, scale: 1.2, duration: 300, yoyo: true, repeat: -1 });
  }

  private collect(pu: Sprite) {
    const kind = pu.getData("kind") as PowerUpKind;
    const now = this.time.now;
    pu.destroy();
    if (kind === "life") this.lives = Math.min(this.lives + 1, 5);
    else if (kind === "spread") this.weapon.spreadUntil = now + POWERUP_DURATION_MS.spread;
    else if (kind === "rapid") this.weapon.rapidUntil = now + POWERUP_DURATION_MS.rapid;
    else this.shieldUntil = now + POWERUP_DURATION_MS.shield;
    this.floatText(this.player.x, this.player.y - 30, kind.toUpperCase(), "#22d3ee");
    this.refreshHud();
  }

  private floatText(x: number, y: number, text: string, color = "#fde047") {
    const t = this.add.text(x, y, text, { ...TEXT_STYLE, fontSize: "14px", color }).setOrigin(0.5);
    this.tweens.add({ targets: t, y: y - 40, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }

  private gameOver() {
    this.over = true;
    this.player.disableBody(true, true);
    this.time.delayedCall(1200, () =>
      this.scene.start("gameover", { score: this.score.score, wave: this.waveNumber, bestCombo: this.score.bestCombo }),
    );
  }

  // ---------------------------------------------------------------- loop

  update(time: number, delta: number) {
    this.stars.update(delta);
    if (this.over || this.physics.world.isPaused) return;

    this.movePlayer();
    if (this.fireKey.isDown || this.dragTarget || this.sys.game.device.input.touch) this.fire(time);

    if (this.score.tick(time)) this.refreshHud();
    this.shieldRing.setPosition(this.player.x, this.player.y).setVisible(time < this.shieldUntil);

    const h = this.scale.height;
    for (const b of this.bullets.getMatching("active", true) as Sprite[]) {
      if (b.y < -20 || b.x < -20 || b.x > this.scale.width + 20) b.disableBody(true, true);
    }
    for (const b of this.enemyBullets.getMatching("active", true) as Sprite[]) {
      if (b.y > h + 20) b.disableBody(true, true);
    }
    for (const pu of this.powerups.getChildren() as Sprite[]) if (pu.y > h + 30) pu.destroy();

    for (const e of this.enemies.getChildren() as Sprite[]) {
      if (e.getData("kind") === "zigzag") {
        const age = (time - e.getData("born")) / 1000;
        e.x = e.getData("originX") + Math.sin(age * 3) * 70;
      }
      if (this.rng() < (this.enemyFireChance * delta) / 1000 && e.y > 0 && e.y < h * 0.7) this.enemyFire(e);
      if (e.y > h + 40) {
        e.destroy();
        this.score.breakCombo();
      }
    }

    if (this.pendingSpawns === 0 && this.enemies.countActive() === 0) {
      this.pendingSpawns = -1; // guard so the next wave is only queued once
      this.time.delayedCall(800, () => this.nextWave());
    }
  }

  private movePlayer() {
    const left = this.cursors.left.isDown || this.wasd.A.isDown;
    const right = this.cursors.right.isDown || this.wasd.D.isDown;
    const up = this.cursors.up.isDown || this.wasd.W.isDown;
    const down = this.cursors.down.isDown || this.wasd.S.isDown;

    if (this.dragTarget) {
      const dx = this.dragTarget.x - this.player.x;
      const dy = this.dragTarget.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 6) this.player.setVelocity(0, 0);
      else this.player.setVelocity((dx / dist) * PLAYER_SPEED * 1.4, (dy / dist) * PLAYER_SPEED * 1.4);
      return;
    }
    const vx = (right ? 1 : 0) - (left ? 1 : 0);
    const vy = (down ? 1 : 0) - (up ? 1 : 0);
    const len = Math.hypot(vx, vy) || 1;
    this.player.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED);
  }

  private enemyFire(e: Sprite) {
    const b = this.enemyBullets.get(e.x, e.y + 16) as Sprite | null;
    if (!b) return;
    b.enableBody(true, e.x, e.y + 16, true, true);
    this.physics.moveToObject(b, this.player, 240 * this.speedMultiplier);
  }
}
