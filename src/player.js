import * as THREE from 'three';
import { STEP_DURATION_MS, TILE_HEIGHT, TILE_SIZE } from './config.js';

// Tibia-7.6-inspired voxel citizen. Assembled from a handful of
// axis-aligned boxes so it reads as a small humanoid on a tile.

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
  const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

function buildCharacter() {
  const root = new THREE.Group();
  root.name = 'character';

  // Torso group (arms attach so we can swing them together).
  const upper = new THREE.Group();
  root.add(upper);

  const torso = boxMesh(0.5, 0.42, 0.3, COLOR.tunic, 0, 0.78, 0);
  upper.add(torso);

  // Tunic trim across the chest.
  upper.add(boxMesh(0.52, 0.06, 0.32, COLOR.tunicTrim, 0, 0.6, 0));

  // Belt + buckle.
  upper.add(boxMesh(0.54, 0.08, 0.34, COLOR.belt, 0, 0.55, 0));
  upper.add(boxMesh(0.14, 0.09, 0.02, COLOR.buckle, 0, 0.55, 0.18));

  // Head + hair cap + tiny eye voxels facing +Z (south) by default.
  const head = boxMesh(0.36, 0.36, 0.36, COLOR.skin, 0, 1.19, 0);
  upper.add(head);
  upper.add(boxMesh(0.38, 0.12, 0.38, COLOR.hair, 0, 1.42, 0));
  // fringe
  upper.add(boxMesh(0.38, 0.06, 0.06, COLOR.hair, 0, 1.33, 0.17));
  // eyes (small dark blocks on the front face)
  upper.add(boxMesh(0.06, 0.06, 0.02, COLOR.eye, -0.08, 1.2, 0.185));
  upper.add(boxMesh(0.06, 0.06, 0.02, COLOR.eye, 0.08, 1.2, 0.185));

  // Arms — pivot at shoulder so they swing naturally.
  const armGeoY = 0.42;
  function makeArm(sideSign) {
    const pivot = new THREE.Group();
    pivot.position.set(sideSign * 0.31, 0.98, 0);
    const sleeve = boxMesh(0.14, 0.28, 0.22, COLOR.tunic, 0, -0.14, 0);
    const hand = boxMesh(0.14, 0.14, 0.22, COLOR.skin, 0, -armGeoY + 0.07, 0);
    pivot.add(sleeve);
    pivot.add(hand);
    return pivot;
  }
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  upper.add(leftArm);
  upper.add(rightArm);

  // Legs — pivot at hip.
  const legLen = 0.4;
  function makeLeg(sideSign) {
    const pivot = new THREE.Group();
    pivot.position.set(sideSign * 0.11, 0.5, 0);
    const pant = boxMesh(0.2, 0.28, 0.24, COLOR.pants, 0, -0.14, 0);
    const boot = boxMesh(0.22, 0.12, 0.28, COLOR.boots, 0, -legLen + 0.06, 0.02);
    pivot.add(pant);
    pivot.add(boot);
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
  // Face along +Z (south) by default; rotate around Y to face the delta.
  return Math.atan2(dx, dz);
}

export class Player {
  constructor(scene, startTileX, startTileZ) {
    this.tileX = startTileX;
    this.tileZ = startTileZ;

    const { root, leftArm, rightArm, leftLeg, rightLeg } = buildCharacter();
    this.mesh = root;
    this.leftArm = leftArm;
    this.rightArm = rightArm;
    this.leftLeg = leftLeg;
    this.rightLeg = rightLeg;

    this.mesh.position.set((this.tileX + 0.5) * TILE_SIZE, TILE_HEIGHT, (this.tileZ + 0.5) * TILE_SIZE);
    this.mesh.rotation.y = Math.PI; // face south by default
    scene.add(this.mesh);

    this.from = { x: this.mesh.position.x, z: this.mesh.position.z };
    this.to = { x: this.mesh.position.x, z: this.mesh.position.z };
    this.stepStart = 0;
    this.stepping = false;
    this.walkPhase = 0;
  }

  get position() {
    return this.mesh.position;
  }

  isStepping() {
    return this.stepping;
  }

  beginStep(nextTileX, nextTileZ, now) {
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
    this.stepStart = now;
    this.stepping = true;
    // Alternate which leg leads on each step.
    this.walkPhase = this.walkPhase === 1 ? -1 : 1;
  }

  update(now) {
    if (!this.stepping) {
      // Idle: relax limbs back to neutral.
      this._setSwing(0);
      this.mesh.position.y = TILE_HEIGHT;
      return;
    }
    const t = Math.min(1, (now - this.stepStart) / STEP_DURATION_MS);
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    this.mesh.position.x = this.from.x + (this.to.x - this.from.x) * e;
    this.mesh.position.z = this.from.z + (this.to.z - this.from.z) * e;

    // Small vertical bob at mid-stride.
    this.mesh.position.y = TILE_HEIGHT + Math.sin(t * Math.PI) * 0.05;

    // Swing arms and legs in opposing phase; peaks mid-step.
    const swing = Math.sin(t * Math.PI) * 0.55 * this.walkPhase;
    this._setSwing(swing);

    if (t >= 1) {
      this.stepping = false;
      this._setSwing(0);
      this.mesh.position.y = TILE_HEIGHT;
    }
  }

  _setSwing(angle) {
    // Arms and legs cross: left arm forward with right leg, etc.
    this.leftArm.rotation.x = angle;
    this.rightArm.rotation.x = -angle;
    this.leftLeg.rotation.x = -angle;
    this.rightLeg.rotation.x = angle;
  }
}
