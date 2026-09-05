import * as THREE from 'three';
import {
  BLOCK_GROUND_SPEED,
  DIAGONAL_STEP_MULT,
  GROUND_SPEED,
  PLAYER_SPEED,
  TILE_HEIGHT,
  TILE_SIZE,
} from './config.js';

const COLOR = {
  skin: 0xe6b48a,
  hair: 0x4a2e1a,
  tunic: 0x2b6cb0,
  tunicTrim: 0xe0b23a,
  belt: 0x3a2416,
  buckle: 0xd4b23a,
  pants: 0x6b4a2a,
  boots: 0x2a1a10,
  eye: 0x1a1a1a,
};

function boxMesh(w, h, d, color, x = 0, y = 0, z = 0) {
  const geo = new THREE.BoxGeometry(w, h, d);
  // depthTest is disabled so buildings between the camera and the
  // character can never fully hide them; renderOrder keeps the
  // character drawn last so it also sits on top of any semi-
  // transparent roof geometry being faded out.
  const mat = new THREE.MeshLambertMaterial({
    color, flatShading: true,
    depthTest: false, depthWrite: false, transparent: true,
  });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.renderOrder = 999;
  return m;
}

function buildCharacter() {
  const root = new THREE.Group();
  root.name = 'character';

  const upper = new THREE.Group();
  root.add(upper);

  const torso = boxMesh(0.5, 0.42, 0.3, COLOR.tunic, 0, 0.78, 0);
  upper.add(torso);
  upper.add(boxMesh(0.52, 0.06, 0.32, COLOR.tunicTrim, 0, 0.6, 0));
  upper.add(boxMesh(0.54, 0.08, 0.34, COLOR.belt, 0, 0.55, 0));
  upper.add(boxMesh(0.14, 0.09, 0.02, COLOR.buckle, 0, 0.55, 0.18));

  const head = boxMesh(0.36, 0.36, 0.36, COLOR.skin, 0, 1.19, 0);
  upper.add(head);
  upper.add(boxMesh(0.38, 0.12, 0.38, COLOR.hair, 0, 1.42, 0));
  upper.add(boxMesh(0.38, 0.06, 0.06, COLOR.hair, 0, 1.33, 0.17));
  upper.add(boxMesh(0.06, 0.06, 0.02, COLOR.eye, -0.08, 1.2, 0.185));
  upper.add(boxMesh(0.06, 0.06, 0.02, COLOR.eye, 0.08, 1.2, 0.185));

  const armGeoY = 0.42;
  function makeArm(sideSign) {
    const pivot = new THREE.Group();
    pivot.position.set(sideSign * 0.31, 0.98, 0);
    pivot.add(boxMesh(0.14, 0.28, 0.22, COLOR.tunic, 0, -0.14, 0));
    pivot.add(boxMesh(0.14, 0.14, 0.22, COLOR.skin, 0, -armGeoY + 0.07, 0));
    return pivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  upper.add(leftArm);
  upper.add(rightArm);

  const legLen = 0.4;
  function makeLeg(sideSign) {
    const pivot = new THREE.Group();
    pivot.position.set(sideSign * 0.11, 0.5, 0);
    pivot.add(boxMesh(0.2, 0.28, 0.24, COLOR.pants, 0, -0.14, 0));
    pivot.add(boxMesh(0.22, 0.12, 0.28, COLOR.boots, 0, -legLen + 0.06, 0.02));
    return pivot;
  }
  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  root.add(leftLeg);
  root.add(rightLeg);

  return { root, leftArm, rightArm, leftLeg, rightLeg };
}

function facingFromDelta(dx, dz) {
  if (dx === 0 && dz === 0) return null;
  return Math.atan2(dx, dz);
}

/**
 * Tibia-style step duration: 1000 * ground / speed, doubled for diagonals.
 */
export function stepDurationMs(block, isDiagonal) {
  const ground = BLOCK_GROUND_SPEED[block] ?? GROUND_SPEED.GRASS;
  const base = (1000 * ground) / PLAYER_SPEED;
  return isDiagonal ? base * DIAGONAL_STEP_MULT : base;
}

export class Player {
  constructor(scene, startTileX, startTileZ) {
    this.tileX = startTileX;
    this.tileZ = startTileZ;

    const parts = buildCharacter();
    this.mesh = parts.root;
    this.leftArm = parts.leftArm;
    this.rightArm = parts.rightArm;
    this.leftLeg = parts.leftLeg;
    this.rightLeg = parts.rightLeg;

    this.mesh.position.set(
      (this.tileX + 0.5) * TILE_SIZE,
      TILE_HEIGHT,
      (this.tileZ + 0.5) * TILE_SIZE,
    );
    // Face south by default (world +Z = toward the camera).
    this.mesh.rotation.y = 0;
    scene.add(this.mesh);

    this.from = { x: this.mesh.position.x, z: this.mesh.position.z };
    this.to = { x: this.mesh.position.x, z: this.mesh.position.z };
    this.stepStart = 0;
    this.stepDuration = 500;
    this.stepping = false;
    this.walkPhase = 0;
  }

  get position() {
    return this.mesh.position;
  }

  isStepping() {
    return this.stepping;
  }

  beginStep(nextTileX, nextTileZ, destBlock, now) {
    const dx = nextTileX - this.tileX;
    const dz = nextTileZ - this.tileZ;
    const facing = facingFromDelta(dx, dz);
    if (facing !== null) this.mesh.rotation.y = facing;

    this.from.x = this.mesh.position.x;
    this.from.z = this.mesh.position.z;
    this.tileX = nextTileX;
    this.tileZ = nextTileZ;
    this.to.x = (nextTileX + 0.5) * TILE_SIZE;
    this.to.z = (nextTileZ + 0.5) * TILE_SIZE;

    const isDiagonal = dx !== 0 && dz !== 0;
    this.stepDuration = stepDurationMs(destBlock, isDiagonal);
    this.stepStart = now;
    this.stepping = true;
    this.walkPhase = this.walkPhase === 1 ? -1 : 1;
  }

  update(now) {
    if (!this.stepping) {
      this._setSwing(0);
      // Character always sits flat on the tile — no bob, no camera shake.
      this.mesh.position.y = TILE_HEIGHT;
      return;
    }
    const t = Math.min(1, (now - this.stepStart) / this.stepDuration);
    // Linear tile-to-tile slide, Tibia-style — no easing, no bob.
    this.mesh.position.x = this.from.x + (this.to.x - this.from.x) * t;
    this.mesh.position.z = this.from.z + (this.to.z - this.from.z) * t;
    this.mesh.position.y = TILE_HEIGHT;

    // Subtle limb swing so the character reads as walking, peaking mid-step.
    const swing = Math.sin(t * Math.PI) * 0.35 * this.walkPhase;
    this._setSwing(swing);

    if (t >= 1) {
      this.stepping = false;
      this._setSwing(0);
    }
  }

  _setSwing(angle) {
    this.leftArm.rotation.x = angle;
    this.rightArm.rotation.x = -angle;
    this.leftLeg.rotation.x = -angle;
    this.rightLeg.rotation.x = angle;
  }
}
