# astro-blaster

[![CI](https://github.com/arjavvirani95/astro-blaster/actions/workflows/ci.yml/badge.svg)](https://github.com/arjavvirani95/astro-blaster/actions/workflows/ci.yml)

An arcade vertical shooter built with **Phaser 3**, **TypeScript** and **Vite**. It plays in the browser on desktop (keyboard) and mobile (touch).

## Gameplay

- Endless waves that ramp up in enemy count, mix, speed and aggression, with a **tank rush** every 5th wave
- Three enemy types: drones, zig-zaggers that weave on a sine path, and armoured tanks
- **Combo scoring**: chain kills within 1.5 seconds to raise your multiplier, up to ×5. Getting hit or letting an enemy past breaks the combo.
- **Power-ups**: spread shot, rapid fire, shield, extra life
- High score saved in the browser

| Action | Keyboard            | Touch            |
|--------|---------------------|------------------|
| Move   | Arrows / WASD       | Drag             |
| Fire   | Space               | Automatic        |
| Pause  | P                   | —                |

## Engineering notes

- **Rules are separate from rendering.** Wave generation, scoring and power-up logic live in `src/logic/` as pure TypeScript with a seeded PRNG, and are unit-tested with Vitest. Scenes only handle rendering, physics and input.
- **No image assets.** Every sprite is drawn procedurally with `Graphics.generateTexture` in `BootScene`.
- Object pooling for player and enemy bullets, Arcade physics overlaps for collisions, a particle emitter for explosions, camera shake, and a parallax starfield.
- `Scale.FIT` keeps a fixed 480×800 playfield that scales to any screen.

```
src/
  logic/      waves.ts, score.ts, powerups.ts, rng.ts   (pure, tested)
  scenes/     Boot → Menu → Game → GameOver, Starfield
  config.ts   tuning constants
```

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test
npm run build    # static files in dist/, ready for any static host
```

## License

MIT
