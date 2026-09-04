import * as THREE from 'three';
import { TILE_HEIGHT, TILE_SIZE } from './config.js';

const COLOR = {
  scale: 0x2a6a2a,
  scaleDark: 0x1e4e1e,
  belly: 0x9ac06a,
  wingMembrane: 0x3a5a2a,
  wingBone: 0x1a2a1a,
  spike: 0x142014,
  claw: 0xdcd0a0,
  horn: 0x2a1a10,
  eye: 0xffd028,
  eyePupil: 0x000000,
  tooth: 0xf0e8c8,
};

function box(w, h, d, color, x = 0, y = 0, z = 0) {
  const g = new THREE.BoxGeometry(w, h, d);
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y, z);
  return mesh;
}

// Backward shift applied to the dragon's inner mesh group so the snout
// sits at the front edge of the caster tile. The mesh's snout tip is
// at local z=+2.14 before the shift; a −1.6 push lands it at ~0.54,
// which is a hair past the tile front (z=+0.5) — perfect for the fire
// wave to start just past the mouth.
const MOUTH_OFFSET = -1.6;

// Build a voxel dragon facing +Z by default.
function buildDragonMesh() {
  const root = new THREE.Group();
  root.name = 'dragon';

  // The dragon is much longer than one tile — snout at local z=1.95,
  // tail at z=-2.95. If we anchor the mesh at its geometric center the
  // fire wave (which starts 1 tile in front of the tile center)
  // renders inside the head. Nest all geometry in an inner group and
  // push it back so the snout sits at the front edge of the tile;
  // then the wave visibly starts a tile past the mouth.
  const inner = new THREE.Group();
  inner.position.z = MOUTH_OFFSET;
  root.add(inner);

  // ── Body: two boxes so belly reads lighter ───────────────────────
  const body = box(1.1, 0.7, 1.8, COLOR.scale, 0, 0.85, 0);
  inner.add(body);
  const belly = box(0.9, 0.35, 1.7, COLOR.belly, 0, 0.55, 0.02);
  inner.add(belly);

  // Spine spikes: five small dark bumps along the back.
  for (let i = -2; i <= 2; i++) {
    inner.add(box(0.14, 0.28, 0.22, COLOR.spike, 0, 1.28, i * 0.32));
  }

  // ── Neck (angled forward) and head ───────────────────────────────
  const neck = box(0.55, 0.55, 0.75, COLOR.scale, 0, 1.15, 1.1);
  neck.rotation.x = -0.35;
  inner.add(neck);

  const head = box(0.7, 0.55, 0.7, COLOR.scale, 0, 1.35, 1.55);
  inner.add(head);
  // Snout
  inner.add(box(0.55, 0.35, 0.5, COLOR.scale, 0, 1.25, 1.95));
  // Underjaw / lighter chin
  inner.add(box(0.5, 0.14, 0.45, COLOR.belly, 0, 1.05, 1.95));
  // Teeth: two small tusks below the snout.
  inner.add(box(0.06, 0.1, 0.06, COLOR.tooth, -0.18, 1.02, 2.14));
  inner.add(box(0.06, 0.1, 0.06, COLOR.tooth, 0.18, 1.02, 2.14));

  // Horns on top of head — swept back.
  const hornL = box(0.14, 0.4, 0.14, COLOR.horn, -0.24, 1.7, 1.45);
  hornL.rotation.x = 0.4;
  inner.add(hornL);
  const hornR = box(0.14, 0.4, 0.14, COLOR.horn, 0.24, 1.7, 1.45);
  hornR.rotation.x = 0.4;
  inner.add(hornR);
  // Little brow ridges
  inner.add(box(0.18, 0.08, 0.08, COLOR.horn, -0.22, 1.6, 1.68));
  inner.add(box(0.18, 0.08, 0.08, COLOR.horn, 0.22, 1.6, 1.68));

  // Eyes: yellow scleras with dark pupils, slit-facing forward.
  inner.add(box(0.14, 0.14, 0.06, COLOR.eye, -0.24, 1.45, 1.88));
  inner.add(box(0.14, 0.14, 0.06, COLOR.eye, 0.24, 1.45, 1.88));
  inner.add(box(0.05, 0.12, 0.02, COLOR.eyePupil, -0.24, 1.45, 1.91));
  inner.add(box(0.05, 0.12, 0.02, COLOR.eyePupil, 0.24, 1.45, 1.91));

  // ── Tail: 5 tapered segments curving back and slightly up ────────
  for (let i = 0; i < 5; i++) {
    const s = 1 - i * 0.14;
    const z = -0.9 - i * 0.4;
    const y = 0.85 + i * 0.08;
    inner.add(box(0.55 * s, 0.5 * s, 0.4, COLOR.scale, 0, y, z));
    inner.add(box(0.4 * s, 0.2 * s, 0.4, COLOR.belly, 0, y - 0.2 * s, z));
    inner.add(box(0.09 * s, 0.16 * s, 0.14, COLOR.spike, 0, y + 0.28 * s, z));
  }
  // Tail tip: two small spikes shaped like a spade.
  inner.add(box(0.24, 0.16, 0.24, COLOR.spike, 0, 1.25, -2.95));

  // ── Legs and clawed feet ─────────────────────────────────────────
  const legPositions = [
    [-0.45, 0.85, 'front-left'],
    [0.45, 0.85, 'front-right'],
    [-0.45, -0.7, 'back-left'],
    [0.45, -0.7, 'back-right'],
  ];
  for (const [x, z] of legPositions) {
    // Upper leg (thigh)
    inner.add(box(0.32, 0.42, 0.32, COLOR.scaleDark, x, 0.55, z));
    // Foot
    inner.add(box(0.36, 0.16, 0.44, COLOR.scaleDark, x, 0.28, z + 0.05));
    // Three claws per foot
    for (let c = -1; c <= 1; c++) {
      inner.add(box(0.05, 0.06, 0.14, COLOR.claw, x + c * 0.11, 0.22, z + 0.3));
    }
  }

  // ── Wings: two big panels that we'll flap ───────────────────────
  function makeWing(sideSign) {
    const pivot = new THREE.Group();
    pivot.position.set(sideSign * 0.55, 1.2, 0.05);
    // Wing arm bone
    const arm = box(1.1, 0.1, 0.15, COLOR.wingBone, sideSign * 0.55, 0, 0);
    pivot.add(arm);
    // Membrane spans downward from the arm.
    const membrane = box(1.15, 0.05, 0.9, COLOR.wingMembrane, sideSign * 0.55, -0.05, -0.35);
    pivot.add(membrane);
    // Finger ribs across the membrane
    for (let i = 0; i < 4; i++) {
      const rz = -0.2 - i * 0.2;
      pivot.add(box(1.1, 0.06, 0.05, COLOR.wingBone, sideSign * 0.55, -0.04, rz));
    }
    // Base rotation: wings held slightly up at rest.
    pivot.rotation.z = sideSign * 0.35;
    return pivot;
  }
  const leftWing = makeWing(-1);
  const rightWing = makeWing(1);
  inner.add(leftWing);
  inner.add(rightWing);

  return { root, leftWing, rightWing };
}

// Snap a (dx, dz) vector to the nearest cardinal — the fire wave is a
// grid-aligned T so cardinal facing keeps the shape crisp.
function snapCardinal(dx, dz) {
  if (dx === 0 && dz === 0) return { fdx: 0, fdz: 1 };
  if (Math.abs(dx) >= Math.abs(dz)) return { fdx: Math.sign(dx), fdz: 0 };
  return { fdx: 0, fdz: Math.sign(dz) };
}

// The 5-tile fire wave shape from the Tibia wiki: row 1 & 2 straight
// ahead, row 3 is a 3-wide bar capping the wave.
const WAVE_OFFSETS = [
  [1, 0],
  [2, 0],
  [3, -1], [3, 0], [3, 1],
];

const FIRE_HOT = 0xffe25a;
const FIRE_MID = 0xff8828;
const FIRE_COOL = 0xd83010;

export class Dragon {
  constructor(scene, tileX, tileZ) {
    this.scene = scene;
    this.tileX = tileX;
    this.tileZ = tileZ;
    this.facing = { fdx: 0, fdz: 1 };
    this.mesh = null;
    this.leftWing = null;
    this.rightWing = null;

    const parts = buildDragonMesh();
    this.mesh = parts.root;
    this.leftWing = parts.leftWing;
    this.rightWing = parts.rightWing;
    this.mesh.position.set((tileX + 0.5) * TILE_SIZE, TILE_HEIGHT, (tileZ + 0.5) * TILE_SIZE);
    scene.add(this.mesh);

    // Fire wave lives in its own group so we can wipe it in one go.
    this.fireGroup = new THREE.Group();
    scene.add(this.fireGroup);
    this.fireMeshes = [];
    this.fireTiles = [];

    this.attackCooldownEnd = 2000;
    this.attackDuration = 900;
    this.attackEndTime = 0;
  }

  isAttacking(now) {
    return now < this.attackEndTime;
  }

  /** Tiles currently on fire (for future damage logic). */
  fireTilesAt(now) {
    return this.isAttacking(now) ? this.fireTiles : [];
  }

  occupies(tileX, tileZ) {
    return tileX === this.tileX && tileZ === this.tileZ;
  }

  update(now, playerTileX, playerTileZ) {
    // Face the player, snapped to cardinal.
    const dx = playerTileX - this.tileX;
    const dz = playerTileZ - this.tileZ;
    const f = snapCardinal(dx, dz);
    this.facing = f;
    this.mesh.rotation.y = Math.atan2(f.fdx, f.fdz);

    // Slow wing flap while idle, faster during an attack.
    const flapSpeed = this.isAttacking(now) ? 0.014 : 0.0035;
    const flap = Math.sin(now * flapSpeed) * 0.28;
    this.leftWing.rotation.z = 0.35 + flap;
    this.rightWing.rotation.z = -0.35 - flap;

    // Fire when the player is within ~8 tiles and roughly ahead.
    const range = Math.abs(dx) + Math.abs(dz);
    const ahead = f.fdx !== 0 ? Math.sign(dx) === f.fdx : Math.sign(dz) === f.fdz;
    if (!this.isAttacking(now) && now > this.attackCooldownEnd
        && range > 0 && range <= 8 && ahead) {
      this._startFireWave(now);
    }
    this._updateFireWave(now);
  }

  _startFireWave(now) {
    this.attackEndTime = now + this.attackDuration;
    this.attackCooldownEnd = now + this.attackDuration + 3200;

    this._clearFire();
    const { fdx, fdz } = this.facing;
    // Right-hand perpendicular to facing: right = (fdz, -fdx).
    const rdx = fdz, rdz = -fdx;

    for (const [f, r] of WAVE_OFFSETS) {
      const wx = this.tileX + fdx * f + rdx * r;
      const wz = this.tileZ + fdz * f + rdz * r;
      this.fireTiles.push([wx, wz]);
      this._addFireTile(wx, wz);
    }
  }

  _addFireTile(wx, wz) {
    // Layered boxes for a chunky flame — hot core, mid, and coolest outer.
    const grp = new THREE.Group();
    grp.position.set((wx + 0.5) * TILE_SIZE, TILE_HEIGHT, (wz + 0.5) * TILE_SIZE);

    const core = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.5, 0.4),
      new THREE.MeshBasicMaterial({
        color: FIRE_HOT, transparent: true, opacity: 0.95,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    core.position.y = 0.35;
    grp.add(core);

    const mid = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.8, 0.7),
      new THREE.MeshBasicMaterial({
        color: FIRE_MID, transparent: true, opacity: 0.75,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    mid.position.y = 0.5;
    grp.add(mid);

    const outer = new THREE.Mesh(
      new THREE.BoxGeometry(0.95, 1.1, 0.95),
      new THREE.MeshBasicMaterial({
        color: FIRE_COOL, transparent: true, opacity: 0.5,
        blending: THREE.AdditiveBlending, depthWrite: false,
      }),
    );
    outer.position.y = 0.6;
    grp.add(outer);

    this.fireGroup.add(grp);
    this.fireMeshes.push(grp);
  }

  _updateFireWave(now) {
    if (!this.isAttacking(now)) {
      if (this.fireMeshes.length) this._clearFire();
      return;
    }
    const t = (this.attackEndTime - now) / this.attackDuration; // 1 -> 0
    // Flicker + shrink as the wave dissipates.
    for (const grp of this.fireMeshes) {
      const flicker = 0.85 + Math.sin(now * 0.03 + grp.position.x + grp.position.z) * 0.15;
      let base = 1;
      // Fade the last 40% of the duration.
      if (t < 0.4) base = t / 0.4;
      grp.children.forEach((m, i) => {
        const opacities = [0.95, 0.75, 0.5];
        m.material.opacity = opacities[i] * base * flicker;
        const scale = 0.9 + Math.sin(now * 0.02 + i) * 0.1;
        m.scale.set(scale, 1 + Math.sin(now * 0.025 + i * 1.3) * 0.15, scale);
      });
    }
  }

  _clearFire() {
    for (const grp of this.fireMeshes) {
      this.fireGroup.remove(grp);
      grp.traverse((o) => {
        if (o.isMesh) {
          o.geometry?.dispose();
          o.material?.dispose();
        }
      });
    }
    this.fireMeshes = [];
    this.fireTiles = [];
  }
}
