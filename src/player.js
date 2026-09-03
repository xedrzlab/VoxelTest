import * as THREE from 'three';
import { STEP_DURATION_MS, TILE_HEIGHT, TILE_SIZE } from './config.js';

const PLAYER_HEIGHT = 1.5;
const PLAYER_WIDTH = 0.6;

export class Player {
  constructor(scene, startTileX, startTileZ) {
    this.tileX = startTileX;
    this.tileZ = startTileZ;

    const geo = new THREE.BoxGeometry(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_WIDTH);
    const mat = new THREE.MeshLambertMaterial({ color: 0xdd4a4a });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.name = 'player';

    const helmetGeo = new THREE.BoxGeometry(PLAYER_WIDTH * 0.9, 0.4, PLAYER_WIDTH * 0.9);
    const helmetMat = new THREE.MeshLambertMaterial({ color: 0x2c2c30 });
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.y = PLAYER_HEIGHT / 2 + 0.2;
    this.mesh.add(helmet);

    this.mesh.position.set(
      (this.tileX + 0.5) * TILE_SIZE,
      TILE_HEIGHT + PLAYER_HEIGHT / 2,
      (this.tileZ + 0.5) * TILE_SIZE,
    );
    scene.add(this.mesh);

    this.from = { x: this.mesh.position.x, z: this.mesh.position.z };
    this.to = { x: this.mesh.position.x, z: this.mesh.position.z };
    this.stepStart = 0;
    this.stepping = false;
  }

  get position() {
    return this.mesh.position;
  }

  isStepping() {
    return this.stepping;
  }

  /** Begin a step toward the given tile. Assumes walkability was checked by caller. */
  beginStep(nextTileX, nextTileZ, now) {
    this.from.x = this.mesh.position.x;
    this.from.z = this.mesh.position.z;
    this.tileX = nextTileX;
    this.tileZ = nextTileZ;
    this.to.x = (nextTileX + 0.5) * TILE_SIZE;
    this.to.z = (nextTileZ + 0.5) * TILE_SIZE;
    this.stepStart = now;
    this.stepping = true;
  }

  update(now) {
    if (!this.stepping) return;
    const t = Math.min(1, (now - this.stepStart) / STEP_DURATION_MS);
    // ease-in-out
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    this.mesh.position.x = this.from.x + (this.to.x - this.from.x) * e;
    this.mesh.position.z = this.from.z + (this.to.z - this.from.z) * e;
    // subtle bob
    this.mesh.position.y = TILE_HEIGHT + PLAYER_HEIGHT / 2 + Math.sin(t * Math.PI) * 0.08;
    if (t >= 1) {
      this.stepping = false;
      this.mesh.position.y = TILE_HEIGHT + PLAYER_HEIGHT / 2;
    }
  }
}
