import * as THREE from 'three';
import {
  BLOCK,
  BLOCK_COLORS,
  BLOCK_SIDE_TINT,
  CHUNK_SIZE,
  ROOF_BASE_HEIGHT,
  STRUCTURE,
  STRUCTURE_HEIGHTS,
  TILE_HEIGHT,
  TILE_SIZE,
} from '../config.js';
import { blockAt, chimneyAt, propAt, roofAt, structureAt, tileHash } from './terrain.js';

const groundMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

// Roofs live on their own material so the game loop can dim it when
// the player steps under a roof.
export const roofMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
  transparent: true,
  opacity: 1,
  depthWrite: true,
});

function pushQuad(positions, normals, colors, indices, p0, p1, p2, p3, normal, color) {
  const i = positions.length / 3;
  positions.push(...p0, ...p1, ...p2, ...p3);
  for (let k = 0; k < 4; k++) normals.push(...normal);
  for (let k = 0; k < 4; k++) colors.push(...color);
  indices.push(i, i + 2, i + 1, i, i + 3, i + 2);
}

function toColor(rgb, tint = 1) {
  return [(rgb[0] / 255) * tint, (rgb[1] / 255) * tint, (rgb[2] / 255) * tint];
}

function groundSurfaceHeight(block) {
  if (block === BLOCK.WATER) return 0.75;
  return TILE_HEIGHT;
}

function pushBox(P, N, C, I, x0, x1, y0, y1, z0, z1, color, sides) {
  const topColor = color;
  const sideColor = color.map((c) => c * BLOCK_SIDE_TINT);
  if (sides & 1) pushQuad(P, N, C, I,
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], [0, 1, 0], topColor);
  if (sides & 2) pushQuad(P, N, C, I,
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [0, 0, -1], sideColor);
  if (sides & 4) pushQuad(P, N, C, I,
    [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1], [0, 0, 1], sideColor);
  if (sides & 8) pushQuad(P, N, C, I,
    [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [-1, 0, 0], sideColor);
  if (sides & 16) pushQuad(P, N, C, I,
    [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [1, 0, 0], sideColor);
  if (sides & 32) pushQuad(P, N, C, I,
    [x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1], [0, -1, 0], sideColor);
}

function addGrassTuft(P, N, C, I, lx, lz, wx, wz) {
  const base = TILE_HEIGHT;
  const ox = (tileHash(wx, wz, 11) - 0.5) * 0.35;
  const oz = (tileHash(wx, wz, 13) - 0.5) * 0.35;
  const blade = toColor([0x38, 0x6d, 0x22]);
  const blade2 = toColor([0x4f, 0x8c, 0x2f]);
  const push = (cx, cz, w, h, d, c) => pushBox(
    P, N, C, I, cx - w / 2, cx + w / 2, base, base + h, cz - d / 2, cz + d / 2, c, 31,
  );
  push(lx + 0.5 + ox, lz + 0.5 + oz, 0.22, 0.55 + tileHash(wx, wz, 17) * 0.2, 0.22, blade);
  push(lx + 0.5 + ox + 0.22, lz + 0.5 + oz - 0.14, 0.16, 0.4, 0.16, blade2);
  if (tileHash(wx, wz, 19) < 0.55) {
    push(lx + 0.5 + ox - 0.18, lz + 0.5 + oz + 0.16, 0.14, 0.3, 0.14, blade2);
  }
}

// Render a half-timbered wall tile: cream plaster body, dark corner
// posts + horizontal beams + vertical center post, and an optional
// yellow-lit window with a flower box below on any face that opens to
// the outside. This is what turns civilian walls from flat gray boxes
// into something that reads like a real house.
function addTimberFrameWall(P, N, C, I, x0, x1, z0, z1, yTop, wallH, sFlags, wx, wz) {
  const plaster = toColor([0xe8, 0xe0, 0xc8]);
  const beam = toColor([0x3a, 0x24, 0x14]);
  const beamLight = toColor([0x4c, 0x30, 0x1a]);

  // Plaster body — slightly inset so beams read as raised timbers.
  pushBox(P, N, C, I,
    x0 + 0.06, x1 - 0.06, yTop, yTop + wallH, z0 + 0.06, z1 - 0.06,
    plaster, sFlags);

  // Top and bottom timber rims wrap the whole tile.
  pushBox(P, N, C, I,
    x0, x1, yTop + wallH - 0.14, yTop + wallH, z0, z1, beam, sFlags);
  pushBox(P, N, C, I,
    x0, x1, yTop, yTop + 0.16, z0, z1, beam, sFlags);
  // Mid horizontal beam splitting the wall into two panels.
  const midY = yTop + wallH * 0.52;
  pushBox(P, N, C, I,
    x0, x1, midY - 0.06, midY + 0.06, z0, z1, beam, sFlags);

  // Four vertical corner posts.
  for (const [cx, cz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) {
    pushBox(P, N, C, I,
      cx - 0.08, cx + 0.08, yTop, yTop + wallH, cz - 0.08, cz + 0.08, beam, 31);
  }
  // Vertical center posts on each exposed outside face.
  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  if (sFlags & 2) pushBox(P, N, C, I,
    mx - 0.05, mx + 0.05, yTop, yTop + wallH, z0 - 0.01, z0 + 0.07, beamLight, 31);
  if (sFlags & 4) pushBox(P, N, C, I,
    mx - 0.05, mx + 0.05, yTop, yTop + wallH, z1 - 0.07, z1 + 0.01, beamLight, 31);
  if (sFlags & 8) pushBox(P, N, C, I,
    x0 - 0.01, x0 + 0.07, yTop, yTop + wallH, mz - 0.05, mz + 0.05, beamLight, 31);
  if (sFlags & 16) pushBox(P, N, C, I,
    x1 - 0.07, x1 + 0.01, yTop, yTop + wallH, mz - 0.05, mz + 0.05, beamLight, 31);

  // Window: place on ONE outside face, chosen deterministically per tile
  // so different tiles get windows on different sides and every ~2nd
  // tile in a wall run actually has one.
  const wantWindow = tileHash(wx, wz, 41) < 0.55;
  if (wantWindow) {
    // Preference order — south first (facing the camera), then east,
    // then north, then west. Take the first exposed one.
    let face = null;
    if (sFlags & 4) face = 'S';
    else if (sFlags & 16) face = 'E';
    else if (sFlags & 2) face = 'N';
    else if (sFlags & 8) face = 'W';
    if (face) addWindowWithFlowerBox(P, N, C, I, x0, x1, z0, z1, yTop, wallH, face);
  }
}

function addWindowWithFlowerBox(P, N, C, I, x0, x1, z0, z1, yTop, wallH, face) {
  const frame = toColor([0xf2, 0xec, 0xdc]);
  const glass = toColor([0xf6, 0xd2, 0x62]);
  const mullion = toColor([0x3a, 0x24, 0x14]);
  const planter = toColor([0x5a, 0x38, 0x1c]);
  const flowerA = toColor([0xd42a2a]);
  const flowerB = toColor([0xf6, 0xd8, 0x54]);

  const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2;
  // Window rectangle sits in the upper panel of the wall.
  const wy0 = yTop + wallH * 0.62;
  const wy1 = yTop + wallH * 0.86;
  const hw = 0.22; // half-width of window
  // Sill and planter Y range.
  const sy0 = yTop + wallH * 0.54;
  const sy1 = yTop + wallH * 0.62;

  const put = (fx0, fx1, fy0, fy1, fz0, fz1, color) =>
    pushBox(P, N, C, I, fx0, fx1, fy0, fy1, fz0, fz1, color, 31);

  if (face === 'S') {
    put(mx - hw, mx + hw, wy0, wy1, z1, z1 + 0.05, frame);
    put(mx - hw + 0.04, mx + hw - 0.04, wy0 + 0.03, wy1 - 0.03, z1 + 0.03, z1 + 0.07, glass);
    put(mx - 0.02, mx + 0.02, wy0, wy1, z1 + 0.05, z1 + 0.08, mullion);
    put(mx - hw + 0.04, mx + hw - 0.04, (wy0 + wy1) / 2 - 0.02, (wy0 + wy1) / 2 + 0.02, z1 + 0.05, z1 + 0.08, mullion);
    // Planter + flowers
    put(mx - hw - 0.03, mx + hw + 0.03, sy0, sy1, z1 - 0.02, z1 + 0.1, planter);
    put(mx - 0.14, mx - 0.02, sy1, sy1 + 0.08, z1 + 0.02, z1 + 0.1, flowerA);
    put(mx + 0.02, mx + 0.14, sy1, sy1 + 0.08, z1 + 0.02, z1 + 0.1, flowerB);
  } else if (face === 'N') {
    put(mx - hw, mx + hw, wy0, wy1, z0 - 0.05, z0, frame);
    put(mx - hw + 0.04, mx + hw - 0.04, wy0 + 0.03, wy1 - 0.03, z0 - 0.07, z0 - 0.03, glass);
    put(mx - 0.02, mx + 0.02, wy0, wy1, z0 - 0.08, z0 - 0.05, mullion);
    put(mx - hw + 0.04, mx + hw - 0.04, (wy0 + wy1) / 2 - 0.02, (wy0 + wy1) / 2 + 0.02, z0 - 0.08, z0 - 0.05, mullion);
    put(mx - hw - 0.03, mx + hw + 0.03, sy0, sy1, z0 - 0.1, z0 + 0.02, planter);
    put(mx - 0.14, mx - 0.02, sy1, sy1 + 0.08, z0 - 0.1, z0 - 0.02, flowerA);
    put(mx + 0.02, mx + 0.14, sy1, sy1 + 0.08, z0 - 0.1, z0 - 0.02, flowerB);
  } else if (face === 'E') {
    const mz = (z0 + z1) / 2;
    put(x1, x1 + 0.05, wy0, wy1, mz - hw, mz + hw, frame);
    put(x1 + 0.03, x1 + 0.07, wy0 + 0.03, wy1 - 0.03, mz - hw + 0.04, mz + hw - 0.04, glass);
    put(x1 + 0.05, x1 + 0.08, wy0, wy1, mz - 0.02, mz + 0.02, mullion);
    put(x1 + 0.05, x1 + 0.08, (wy0 + wy1) / 2 - 0.02, (wy0 + wy1) / 2 + 0.02, mz - hw + 0.04, mz + hw - 0.04, mullion);
    put(x1 - 0.02, x1 + 0.1, sy0, sy1, mz - hw - 0.03, mz + hw + 0.03, planter);
    put(x1 + 0.02, x1 + 0.1, sy1, sy1 + 0.08, mz - 0.14, mz - 0.02, flowerA);
    put(x1 + 0.02, x1 + 0.1, sy1, sy1 + 0.08, mz + 0.02, mz + 0.14, flowerB);
  } else if (face === 'W') {
    const mz = (z0 + z1) / 2;
    put(x0 - 0.05, x0, wy0, wy1, mz - hw, mz + hw, frame);
    put(x0 - 0.07, x0 - 0.03, wy0 + 0.03, wy1 - 0.03, mz - hw + 0.04, mz + hw - 0.04, glass);
    put(x0 - 0.08, x0 - 0.05, wy0, wy1, mz - 0.02, mz + 0.02, mullion);
    put(x0 - 0.08, x0 - 0.05, (wy0 + wy1) / 2 - 0.02, (wy0 + wy1) / 2 + 0.02, mz - hw + 0.04, mz + hw - 0.04, mullion);
    put(x0 - 0.1, x0 + 0.02, sy0, sy1, mz - hw - 0.03, mz + hw + 0.03, planter);
    put(x0 - 0.1, x0 - 0.02, sy1, sy1 + 0.08, mz - 0.14, mz - 0.02, flowerA);
    put(x0 - 0.1, x0 - 0.02, sy1, sy1 + 0.08, mz + 0.02, mz + 0.14, flowerB);
  }
}

function addPebble(P, N, C, I, lx, lz, wx, wz) {
  const base = TILE_HEIGHT;
  const ox = (tileHash(wx, wz, 23) - 0.5) * 0.4;
  const oz = (tileHash(wx, wz, 29) - 0.5) * 0.4;
  const c = toColor([0x9a, 0x9d, 0xa0]);
  pushBox(P, N, C, I,
    lx + ox + 0.42, lx + ox + 0.58, base, base + 0.12,
    lz + oz + 0.42, lz + oz + 0.58, c, 31);
}

// Small prop renderers. Each draws itself sitting on top of the ground
// at (lx, lz). Base tile height assumed = TILE_HEIGHT.
function addProp(P, N, C, I, lx, lz, kind) {
  const base = TILE_HEIGHT;
  const cx = lx + 0.5, cz = lz + 0.5;
  const color = toColor(BLOCK_COLORS[kind] ?? [255, 0, 255]);
  const h = STRUCTURE_HEIGHTS[kind] ?? 0.5;

  if (kind === STRUCTURE.LAMPPOST) {
    // Dark wood post + small warm bulb on top.
    pushBox(P, N, C, I,
      cx - 0.06, cx + 0.06, base, base + h, cz - 0.06, cz + 0.06, color, 31);
    const bulb = toColor([0xff, 0xe0, 0x74]);
    pushBox(P, N, C, I,
      cx - 0.14, cx + 0.14, base + h, base + h + 0.2, cz - 0.14, cz + 0.14, bulb, 31);
    // Cross-arm at the top
    const arm = toColor([0x2c, 0x22, 0x18]);
    pushBox(P, N, C, I,
      cx - 0.02, cx + 0.02, base + h - 0.05, base + h - 0.02, cz - 0.14, cz + 0.14, arm, 31);
  } else if (kind === STRUCTURE.BARREL) {
    pushBox(P, N, C, I,
      cx - 0.22, cx + 0.22, base, base + h, cz - 0.22, cz + 0.22, color, 31);
    // dark hoops
    const hoop = toColor([0x3a, 0x24, 0x12]);
    pushBox(P, N, C, I,
      cx - 0.23, cx + 0.23, base + 0.12, base + 0.16, cz - 0.23, cz + 0.23, hoop, 31);
    pushBox(P, N, C, I,
      cx - 0.23, cx + 0.23, base + 0.32, base + 0.36, cz - 0.23, cz + 0.23, hoop, 31);
  } else if (kind === STRUCTURE.CRATE) {
    pushBox(P, N, C, I,
      cx - 0.25, cx + 0.25, base, base + h, cz - 0.25, cz + 0.25, color, 31);
    // Simple X pattern via a thinner darker cross.
    const dark = toColor([0x5a, 0x3c, 0x1c]);
    pushBox(P, N, C, I,
      cx - 0.26, cx + 0.26, base + h - 0.02, base + h + 0.001, cz - 0.03, cz + 0.03, dark, 1);
  } else if (kind === STRUCTURE.FLOWER_POT) {
    // Terracotta pot + a bright flower on top.
    pushBox(P, N, C, I,
      cx - 0.18, cx + 0.18, base, base + h, cz - 0.18, cz + 0.18, color, 31);
    const flower = toColor([0xf6, 0xd8, 0x54]);
    pushBox(P, N, C, I,
      cx - 0.12, cx + 0.12, base + h, base + h + 0.12, cz - 0.12, cz + 0.12, flower, 31);
    const stem = toColor([0x2c, 0x66, 0x2c]);
    pushBox(P, N, C, I,
      cx - 0.03, cx + 0.03, base + h, base + h + 0.08, cz - 0.03, cz + 0.03, stem, 31);
  } else if (kind === STRUCTURE.BUSH) {
    pushBox(P, N, C, I,
      cx - 0.28, cx + 0.28, base, base + h, cz - 0.28, cz + 0.28, color, 31);
    // Little offset bump for lumpy shape.
    pushBox(P, N, C, I,
      cx - 0.18, cx + 0.22, base + h, base + h + 0.14, cz - 0.22, cz + 0.18, color, 31);
  } else if (kind === STRUCTURE.SIGN) {
    // Post + horizontal panel.
    const post = toColor([0x4a, 0x30, 0x1a]);
    pushBox(P, N, C, I,
      cx - 0.04, cx + 0.04, base, base + h, cz - 0.04, cz + 0.04, post, 31);
    pushBox(P, N, C, I,
      cx - 0.25, cx + 0.25, base + h - 0.25, base + h, cz - 0.03, cz + 0.03, color, 31);
  }
}

export function buildChunkMesh(chunkX, chunkZ) {
  const gP = [], gN = [], gC = [], gI = [];
  const rP = [], rN = [], rC = [], rI = [];

  const originX = chunkX * CHUNK_SIZE;
  const originZ = chunkZ * CHUNK_SIZE;
  const s = TILE_SIZE;

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = originX + lx;
      const wz = originZ + lz;
      const block = blockAt(wx, wz);
      if (block === BLOCK.AIR) continue;

      const baseRGB = BLOCK_COLORS[block] ?? [255, 0, 255];
      const groundColor = toColor(baseRGB, 1.0);
      const x0 = lx * s, x1 = x0 + s, z0 = lz * s, z1 = z0 + s;
      const yTop = groundSurfaceHeight(block);

      let sideFlags = 1;
      const neighborTop = (nwx, nwz) => {
        const nb = blockAt(nwx, nwz);
        if (nb === BLOCK.AIR) return -1;
        return groundSurfaceHeight(nb);
      };
      if (neighborTop(wx, wz - 1) < yTop) sideFlags |= 2;
      if (neighborTop(wx, wz + 1) < yTop) sideFlags |= 4;
      if (neighborTop(wx - 1, wz) < yTop) sideFlags |= 8;
      if (neighborTop(wx + 1, wz) < yTop) sideFlags |= 16;
      pushBox(gP, gN, gC, gI, x0, x1, 0, yTop, z0, z1, groundColor, sideFlags);

      const struct = structureAt(wx, wz);
      if (struct !== 0 && struct !== STRUCTURE.NONE) {
        const structColor = toColor(BLOCK_COLORS[struct] ?? [255, 0, 255], 1.0);
        const sh = STRUCTURE_HEIGHTS[struct] ?? 1;
        let sFlags = 1;
        if (structureAt(wx, wz - 1) !== struct) sFlags |= 2;
        if (structureAt(wx, wz + 1) !== struct) sFlags |= 4;
        if (structureAt(wx - 1, wz) !== struct) sFlags |= 8;
        if (structureAt(wx + 1, wz) !== struct) sFlags |= 16;

        if (struct === STRUCTURE.TREE_TRUNK) {
          const cx = lx + 0.5, cz = lz + 0.5;
          pushBox(gP, gN, gC, gI,
            cx - 0.15, cx + 0.15, yTop, yTop + sh, cz - 0.15, cz + 0.15, structColor, 31);
        } else if (struct === STRUCTURE.FENCE) {
          pushBox(gP, gN, gC, gI,
            x0, x1, yTop, yTop + sh, z0 + 0.4, z1 - 0.4, structColor, 31);
        } else if (struct === STRUCTURE.FOUNTAIN) {
          pushBox(gP, gN, gC, gI,
            x0 + 0.05, x1 - 0.05, yTop, yTop + sh, z0 + 0.05, z1 - 0.05, structColor, 31);
          const wcolor = toColor(BLOCK_COLORS[BLOCK.WATER]);
          pushBox(gP, gN, gC, gI,
            x0 + 0.25, x1 - 0.25, yTop + sh, yTop + sh + 0.05, z0 + 0.25, z1 - 0.25, wcolor, 31);
        } else if (struct === STRUCTURE.SHIP_HULL) {
          pushBox(gP, gN, gC, gI,
            x0, x1, 0.55, 0.55 + sh, z0, z1, structColor, sFlags | 32);
        } else if (struct === STRUCTURE.DOCK_WOOD) {
          pushBox(gP, gN, gC, gI,
            x0, x1, 0.9, 0.9 + sh, z0, z1, structColor, 31);
        } else if (struct === STRUCTURE.WALL_TIMBER) {
          addTimberFrameWall(gP, gN, gC, gI,
            x0, x1, z0, z1, yTop, sh, sFlags, wx, wz);
        } else {
          pushBox(gP, gN, gC, gI,
            x0, x1, yTop, yTop + sh, z0, z1, structColor, sFlags);
        }
      }

      // Props (on-ground decorations) — go into ground mesh.
      const pr = propAt(wx, wz);
      if (pr !== 0) addProp(gP, gN, gC, gI, lx, lz, pr);

      // Roof — separate mesh so it can be dimmed independently.
      const roof = roofAt(wx, wz);
      if (roof !== 0) {
        const roofColor = toColor(BLOCK_COLORS[roof] ?? [255, 0, 255], 1.0);
        const rh = STRUCTURE_HEIGHTS[roof] ?? 0.5;

        if (roof === STRUCTURE.SAIL) {
          const hullTopY = 0.55 + STRUCTURE_HEIGHTS[STRUCTURE.SHIP_HULL]
            + STRUCTURE_HEIGHTS[STRUCTURE.SHIP_DECK];
          const cx = lx + 0.5, cz = lz + 0.5;
          const mastColor = toColor(BLOCK_COLORS[STRUCTURE.MAST]);
          pushBox(rP, rN, rC, rI,
            cx - 0.06, cx + 0.06, hullTopY, hullTopY + 2.6, cz - 0.06, cz + 0.06, mastColor, 31);
          pushBox(rP, rN, rC, rI,
            x0 + 0.35, x1 - 0.35, hullTopY + 1.0, hullTopY + 1.0 + rh,
            z0 - 0.3, z1 + 0.3, roofColor, 31);
        } else if (roof === STRUCTURE.SHIP_DECK) {
          const deckY = 0.55 + STRUCTURE_HEIGHTS[STRUCTURE.SHIP_HULL];
          pushBox(rP, rN, rC, rI,
            x0, x1, deckY, deckY + rh, z0, z1, roofColor, 31);
        } else if (roof === STRUCTURE.TREE_LEAVES) {
          const cx = lx + 0.5, cz = lz + 0.5;
          const trunkTop = yTop + STRUCTURE_HEIGHTS[STRUCTURE.TREE_TRUNK];
          pushBox(rP, rN, rC, rI,
            cx - 0.55, cx + 0.55, trunkTop, trunkTop + rh,
            cz - 0.55, cz + 0.55, roofColor, 31);
        } else {
          const baseY = yTop + (ROOF_BASE_HEIGHT[roof] ?? 2.3);
          let rFlags = 1 | 32;
          if (roofAt(wx, wz - 1) !== roof) rFlags |= 2;
          if (roofAt(wx, wz + 1) !== roof) rFlags |= 4;
          if (roofAt(wx - 1, wz) !== roof) rFlags |= 8;
          if (roofAt(wx + 1, wz) !== roof) rFlags |= 16;
          pushBox(rP, rN, rC, rI,
            x0, x1, baseY, baseY + rh, z0, z1, roofColor, rFlags);
          // Darker eave overhanging the walls, only on the outer
          // roof tiles — this is what casts the "shadow line" under
          // the roof in real half-timbered buildings.
          if (rFlags & (2 | 4 | 8 | 16)) {
            const eaveColor = toColor([0x38, 0x20, 0x10]);
            const eaveH = 0.14;
            const oh = 0.15;
            const ex0 = (rFlags & 8) ? x0 - oh : x0;
            const ex1 = (rFlags & 16) ? x1 + oh : x1;
            const ez0 = (rFlags & 2) ? z0 - oh : z0;
            const ez1 = (rFlags & 4) ? z1 + oh : z1;
            pushBox(rP, rN, rC, rI,
              ex0, ex1, baseY - eaveH, baseY, ez0, ez1, eaveColor, rFlags | 32);
          }
        }
      }

      // Chimney sits on TOP of the roof of the same tile.
      const chim = chimneyAt(wx, wz);
      if (chim !== 0) {
        const chimColor = toColor(BLOCK_COLORS[chim]);
        const roofType = roof || STRUCTURE.ROOF_RED;
        const baseY = yTop + (ROOF_BASE_HEIGHT[roofType] ?? 2.3)
          + (STRUCTURE_HEIGHTS[roofType] ?? 0.6);
        const ch = STRUCTURE_HEIGHTS[STRUCTURE.CHIMNEY];
        const cx = lx + 0.5, cz = lz + 0.5;
        pushBox(rP, rN, rC, rI,
          cx - 0.15, cx + 0.15, baseY, baseY + ch, cz - 0.15, cz + 0.15, chimColor, 31);
        const smoke = toColor([0x2a, 0x22, 0x1c]);
        pushBox(rP, rN, rC, rI,
          cx - 0.18, cx + 0.18, baseY + ch, baseY + ch + 0.08, cz - 0.18, cz + 0.18, smoke, 31);
      }

      if (block === BLOCK.GRASS && struct === 0 && roof === 0 && pr === 0
          && tileHash(wx, wz, 3) < 0.14) {
        addGrassTuft(gP, gN, gC, gI, lx, lz, wx, wz);
      } else if (block === BLOCK.STONE && struct === 0 && tileHash(wx, wz, 5) < 0.08) {
        addPebble(gP, gN, gC, gI, lx, lz, wx, wz);
      }
    }
  }

  const group = new THREE.Group();
  group.name = `chunk_${chunkX}_${chunkZ}`;
  group.position.set(originX * s, 0, originZ * s);

  const groundGeom = new THREE.BufferGeometry();
  groundGeom.setAttribute('position', new THREE.Float32BufferAttribute(gP, 3));
  groundGeom.setAttribute('normal', new THREE.Float32BufferAttribute(gN, 3));
  groundGeom.setAttribute('color', new THREE.Float32BufferAttribute(gC, 3));
  groundGeom.setIndex(gI);
  groundGeom.computeBoundingSphere();
  const groundMesh = new THREE.Mesh(groundGeom, groundMaterial);
  groundMesh.matrixAutoUpdate = false;
  group.add(groundMesh);

  if (rP.length > 0) {
    const roofGeom = new THREE.BufferGeometry();
    roofGeom.setAttribute('position', new THREE.Float32BufferAttribute(rP, 3));
    roofGeom.setAttribute('normal', new THREE.Float32BufferAttribute(rN, 3));
    roofGeom.setAttribute('color', new THREE.Float32BufferAttribute(rC, 3));
    roofGeom.setIndex(rI);
    roofGeom.computeBoundingSphere();
    const roofMesh = new THREE.Mesh(roofGeom, roofMaterial);
    roofMesh.matrixAutoUpdate = false;
    group.add(roofMesh);
  }

  group.matrixAutoUpdate = false;
  group.updateMatrix();
  return group;
}

export function disposeChunkMesh(group) {
  if (!group) return;
  group.traverse((obj) => {
    if (obj.isMesh) obj.geometry?.dispose();
  });
}
