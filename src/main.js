import * as THREE from 'three';
import { TILE_HEIGHT, TILE_SIZE, WORLD_SIZE_TILES } from './config.js';
import { createIsometricCamera, followTarget, resizeCamera } from './camera.js';
import { Dragon } from './dragon.js';
import { InputController } from './input.js';
import { SHOWROOM } from './items.js';
import { MiniMap } from './minimap.js';
import { Player } from './player.js';
import { roofMaterial } from './world/chunk.js';
import { roofAt } from './world/terrain.js';
import { World } from './world/world.js';

function init() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x0b0d10, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec9f0);

  const hemi = new THREE.HemisphereLight(0xffffff, 0x334455, 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 0.9);
  sun.position.set(20, 40, 15);
  scene.add(sun);

  const camera = createIsometricCamera();

  const world = new World(scene);
  const startTile = Math.floor(WORLD_SIZE_TILES / 2);
  const player = new Player(scene, startTile, startTile);
  world.update(player.tileX, player.tileZ);

  // Spawn a green dragon on the countryside east of the city so the
  // player can walk out the East Gate along Main Street and meet it.
  const dragon = new Dragon(scene, 112, 64);
  const monsters = [dragon];

  // Armory showroom just north of the East Gate — 28 hand-built items
  // laid out in a 4 x 7 grid on cobbled ground for close inspection.
  const SHOWROOM_ORIGIN_X = 100;
  const SHOWROOM_ORIGIN_Z = 56;
  const showroomGroup = new THREE.Group();
  showroomGroup.name = 'showroom';
  scene.add(showroomGroup);
  for (const [col, row, build /* , label */] of SHOWROOM) {
    const grp = build();
    grp.position.set(
      (SHOWROOM_ORIGIN_X + col + 0.5) * TILE_SIZE,
      TILE_HEIGHT,
      (SHOWROOM_ORIGIN_Z + row + 0.5) * TILE_SIZE,
    );
    showroomGroup.add(grp);
  }

  const input = new InputController();
  const statsEl = document.getElementById('stats');
  const minimap = new MiniMap(document.getElementById('minimap'), player);
  minimap.render(true);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    resizeCamera(camera);
  });

  let last = performance.now();
  let frame = 0;
  let fpsAcc = 0, fpsCount = 0, fpsShown = 0;
  // Smooth the roof opacity so it fades in/out over ~100 ms.
  let roofOpacityTarget = 1;

  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    player.update(now);

    if (!player.isStepping()) {
      const dir = input.currentDirection();
      if (dir) {
        const nx = player.tileX + dir.x;
        const nz = player.tileZ + dir.z;
        const monsterHere = (tx, tz) => monsters.some((m) => m.occupies(tx, tz));
        const diagonalOk =
          dir.x === 0 || dir.z === 0 ||
          (world.isWalkable(player.tileX + dir.x, player.tileZ) &&
            !monsterHere(player.tileX + dir.x, player.tileZ) &&
            world.isWalkable(player.tileX, player.tileZ + dir.z) &&
            !monsterHere(player.tileX, player.tileZ + dir.z));
        if (world.isWalkable(nx, nz) && diagonalOk && !monsterHere(nx, nz)) {
          const destBlock = world.blockAt(nx, nz);
          player.beginStep(nx, nz, destBlock, now);
        }
      }
    }

    for (const m of monsters) m.update(now, player.tileX, player.tileZ);

    world.update(player.tileX, player.tileZ);
    followTarget(camera, player.position);

    // Fully hide roofs when the player is standing on a roofed tile.
    const underRoof = roofAt(player.tileX, player.tileZ) !== 0;
    roofOpacityTarget = underRoof ? 0 : 1;
    const k = 1 - Math.exp(-dt * 12);
    roofMaterial.opacity += (roofOpacityTarget - roofMaterial.opacity) * k;
    // depthWrite off while translucent so a mid-fade roof doesn't occlude
    // the interior geometry behind it.
    roofMaterial.transparent = roofMaterial.opacity < 0.999;
    roofMaterial.depthWrite = !roofMaterial.transparent;
    roofMaterial.visible = roofMaterial.opacity > 0.005;

    renderer.render(scene, camera);
    minimap.render();

    fpsAcc += dt;
    fpsCount++;
    frame++;
    if (fpsAcc >= 0.5) {
      fpsShown = Math.round(fpsCount / fpsAcc);
      fpsAcc = 0;
      fpsCount = 0;
    }
    if (statsEl && (frame & 7) === 0) {
      statsEl.textContent =
        `v0.5.3  ·  fps ${fpsShown}  ·  tile ${player.tileX},${player.tileZ}  ·  ` +
        `chunks ${world.loadedChunkCount}${underRoof ? '  ·  indoors' : ''}`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

init();
