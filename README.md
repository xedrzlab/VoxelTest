# VoxelTest — Phase 1

Tibia-inspired voxel isometric RPG foundation. Vanilla JS + Three.js + Vite.

## Run

```
npm install
npm run dev
```

Open the printed local URL. Move with arrow keys / WASD, or the on-screen d-pad on touch devices.

## What's in Phase 1

- 128×128 tile world made of 16×16 chunks; only chunks within `VIEW_RADIUS_CHUNKS` of the player are meshed, others are unloaded.
- Grass / dirt / stone patches from layered simplex noise.
- Chunk meshes use face culling (top faces + only side faces exposed to air; internal and bottom faces skipped). A single shared material with vertex colors keeps draw calls to one per chunk.
- Fixed isometric `OrthographicCamera` (no rotation), smooth follow.
- Tile-to-tile grid movement with a short eased step animation.
- Mobile-first d-pad overlay (touch + click) and arrow keys / WASD.

## Layout

```
src/
  main.js         game loop
  camera.js       orthographic isometric camera + follow
  input.js        keyboard + d-pad
  player.js       placeholder character + tile stepping
  config.js       shared constants
  style.css       HUD + d-pad styling
  world/
    terrain.js    simplex-noise block selection
    chunk.js      per-chunk mesh builder
    world.js     chunk load/unload around the player
```

## Next

Only Phase 1 is here — inventory, combat, multiple floors, and asset pipeline come later.
