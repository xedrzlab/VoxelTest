import * as THREE from 'three';
import { WORLD_SIZE_TILES } from './config.js';
import { createIsometricCamera, followTarget, resizeCamera } from './camera.js';
import { InputController } from './input.js';
import { Player } from './player.js';
import { World } from './world/world.js';

function init() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x0b0d10, 1);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9ec9f0);

  // Lights: a soft hemisphere + directional sun for the isometric shading.
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

  const input = new InputController();
  const statsEl = document.getElementById('stats');

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    resizeCamera(camera);
  });

  let last = performance.now();
  let frame = 0;
  let fpsAcc = 0;
  let fpsCount = 0;
  let fpsShown = 0;

  function tick(now) {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;

    // Advance any in-progress step.
    player.update(now);

    // If idle and a direction is held, start the next step.
    if (!player.isStepping()) {
      const dir = input.currentDirection();
      if (dir) {
        const nx = player.tileX + dir.x;
        const nz = player.tileZ + dir.z;
        // Diagonal step needs both adjacent cardinal tiles clear too, so
        // the character never squeezes through a corner.
        const diagonalOk =
          dir.x === 0 ||
          dir.z === 0 ||
          (world.isWalkable(player.tileX + dir.x, player.tileZ) &&
            world.isWalkable(player.tileX, player.tileZ + dir.z));
        if (world.isWalkable(nx, nz) && diagonalOk) {
          player.beginStep(nx, nz, now);
        }
      }
    }

    world.update(player.tileX, player.tileZ);
    followTarget(camera, player.position, dt);

    renderer.render(scene, camera);

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
        `fps ${fpsShown}  ·  tile ${player.tileX},${player.tileZ}  ·  ` +
        `chunks ${world.loadedChunkCount}`;
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

init();
