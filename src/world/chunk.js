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
import { blockAt, roofAt, structureAt, tileHash } from './terrain.js';

const chunkMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

function pushQuad(positions, normals, colors, indices, p0, p1, p2, p3, normal, color) {
  const i = positions.length / 3;
  positions.push(...p0, ...p1, ...p2, ...p3);
  for (let k = 0; k < 4; k++) normals.push(...normal);
  for (let k = 0; k < 4; k++) colors.push(...color);
  // Reversed winding so the face normal matches the supplied vertex normal.
  indices.push(i, i + 2, i + 1, i, i + 3, i + 2);
}

function toColor(rgb, tint = 1) {
  return [(rgb[0] / 255) * tint, (rgb[1] / 255) * tint, (rgb[2] / 255) * tint];
}

function groundSurfaceHeight(block) {
  // Water sits a little below tile surface.
  if (block === BLOCK.WATER) return 0.75;
  return TILE_HEIGHT;
}

function pushBox(positions, normals, colors, indices, x0, x1, y0, y1, z0, z1, color, sides) {
  // sides bit flags: 1=top, 2=north(-z), 4=south(+z), 8=west(-x), 16=east(+x), 32=bottom
  const topColor = color;
  const sideColor = color.map((c) => c * BLOCK_SIDE_TINT);

  if (sides & 1) {
    pushQuad(positions, normals, colors, indices,
      [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
      [0, 1, 0], topColor);
  }
  if (sides & 2) {
    pushQuad(positions, normals, colors, indices,
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [0, 0, -1], sideColor);
  }
  if (sides & 4) {
    pushQuad(positions, normals, colors, indices,
      [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1],
      [0, 0, 1], sideColor);
  }
  if (sides & 8) {
    pushQuad(positions, normals, colors, indices,
      [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1],
      [-1, 0, 0], sideColor);
  }
  if (sides & 16) {
    pushQuad(positions, normals, colors, indices,
      [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0],
      [1, 0, 0], sideColor);
  }
  if (sides & 32) {
    pushQuad(positions, normals, colors, indices,
      [x1, y0, z0], [x0, y0, z0], [x0, y0, z1], [x1, y0, z1],
      [0, -1, 0], sideColor);
  }
}

function addGrassTuft(positions, normals, colors, indices, lx, lz, wx, wz) {
  const base = TILE_HEIGHT;
  const ox = (tileHash(wx, wz, 11) - 0.5) * 0.35;
  const oz = (tileHash(wx, wz, 13) - 0.5) * 0.35;
  const blade = toColor([0x38, 0x6d, 0x22]);
  const blade2 = toColor([0x4f, 0x8c, 0x2f]);
  const push = (cx, cz, w, h, d, c) => {
    pushBox(positions, normals, colors, indices,
      cx - w / 2, cx + w / 2, base, base + h, cz - d / 2, cz + d / 2, c, 31);
  };
  push(lx + 0.5 + ox, lz + 0.5 + oz, 0.22, 0.55 + tileHash(wx, wz, 17) * 0.2, 0.22, blade);
  push(lx + 0.5 + ox + 0.22, lz + 0.5 + oz - 0.14, 0.16, 0.4, 0.16, blade2);
  if (tileHash(wx, wz, 19) < 0.55) {
    push(lx + 0.5 + ox - 0.18, lz + 0.5 + oz + 0.16, 0.14, 0.3, 0.14, blade2);
  }
}

function addPebble(positions, normals, colors, indices, lx, lz, wx, wz) {
  const base = TILE_HEIGHT;
  const ox = (tileHash(wx, wz, 23) - 0.5) * 0.4;
  const oz = (tileHash(wx, wz, 29) - 0.5) * 0.4;
  const c = toColor([0x9a, 0x9d, 0xa0]);
  pushBox(positions, normals, colors, indices,
    lx + ox + 0.42, lx + ox + 0.58, base, base + 0.12,
    lz + oz + 0.42, lz + oz + 0.58, c, 31);
}

export function buildChunkMesh(chunkX, chunkZ) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];

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

      const x0 = lx * s;
      const x1 = x0 + s;
      const z0 = lz * s;
      const z1 = z0 + s;

      const yTop = groundSurfaceHeight(block);

      // Which side faces of the ground box to draw. We show a side
      // whenever the neighboring tile has a lower surface or is air.
      let sideFlags = 1; // top always
      const neighborTop = (nwx, nwz) => {
        const nb = blockAt(nwx, nwz);
        if (nb === BLOCK.AIR) return -1;
        return groundSurfaceHeight(nb);
      };
      if (neighborTop(wx, wz - 1) < yTop) sideFlags |= 2;
      if (neighborTop(wx, wz + 1) < yTop) sideFlags |= 4;
      if (neighborTop(wx - 1, wz) < yTop) sideFlags |= 8;
      if (neighborTop(wx + 1, wz) < yTop) sideFlags |= 16;

      pushBox(positions, normals, colors, indices,
        x0, x1, 0, yTop, z0, z1, groundColor, sideFlags);

      // Structures rising off the tile (walls, trees, ships, etc.)
      const struct = structureAt(wx, wz);
      const roof = roofAt(wx, wz);

      if (struct !== 0 && struct !== STRUCTURE.NONE) {
        const structRGB = BLOCK_COLORS[struct] ?? [255, 0, 255];
        const structColor = toColor(structRGB, 1.0);
        const sh = STRUCTURE_HEIGHTS[struct] ?? 1;
        // Cull faces where an adjacent tile has the same structure
        // of the same height, so a wall run reads as one block.
        let sFlags = 1; // top visible
        const nStruct = (nwx, nwz) => structureAt(nwx, nwz);
        if (nStruct(wx, wz - 1) !== struct) sFlags |= 2;
        if (nStruct(wx, wz + 1) !== struct) sFlags |= 4;
        if (nStruct(wx - 1, wz) !== struct) sFlags |= 8;
        if (nStruct(wx + 1, wz) !== struct) sFlags |= 16;
        // Special-case narrow structures so they look right centered.
        if (struct === STRUCTURE.TREE_TRUNK) {
          const cx = lx + 0.5, cz = lz + 0.5;
          pushBox(positions, normals, colors, indices,
            cx - 0.15, cx + 0.15, yTop, yTop + sh, cz - 0.15, cz + 0.15, structColor, 31);
        } else if (struct === STRUCTURE.MAST) {
          const cx = lx + 0.5, cz = lz + 0.5;
          pushBox(positions, normals, colors, indices,
            cx - 0.08, cx + 0.08, yTop, yTop + sh, cz - 0.08, cz + 0.08, structColor, 31);
        } else if (struct === STRUCTURE.FENCE) {
          pushBox(positions, normals, colors, indices,
            x0, x1, yTop, yTop + sh, z0 + 0.4, z1 - 0.4, structColor, 31);
        } else if (struct === STRUCTURE.FOUNTAIN) {
          pushBox(positions, normals, colors, indices,
            x0 + 0.05, x1 - 0.05, yTop, yTop + sh, z0 + 0.05, z1 - 0.05, structColor, 31);
          // Small water crown in the middle.
          const wcolor = toColor(BLOCK_COLORS[BLOCK.WATER]);
          pushBox(positions, normals, colors, indices,
            x0 + 0.25, x1 - 0.25, yTop + sh, yTop + sh + 0.05, z0 + 0.25, z1 - 0.25, wcolor, 31);
        } else if (struct === STRUCTURE.SHIP_HULL) {
          // Ship sits partially submerged; full-tile so hulls fuse.
          pushBox(positions, normals, colors, indices,
            x0, x1, 0.55, 0.55 + sh, z0, z1, structColor, sFlags | 32);
        } else if (struct === STRUCTURE.DOCK_WOOD) {
          pushBox(positions, normals, colors, indices,
            x0, x1, 0.9, 0.9 + sh, z0, z1, structColor, 31);
        } else {
          pushBox(positions, normals, colors, indices,
            x0, x1, yTop, yTop + sh, z0, z1, structColor, sFlags);
        }
      }

      if (roof !== 0) {
        const roofRGB = BLOCK_COLORS[roof] ?? [255, 0, 255];
        const roofColor = toColor(roofRGB, 1.0);
        const rh = STRUCTURE_HEIGHTS[roof] ?? 0.5;

        if (roof === STRUCTURE.SAIL) {
          // Mast pole + sail sitting on top of the ship deck.
          const hullTopY = 0.55 + STRUCTURE_HEIGHTS[STRUCTURE.SHIP_HULL]
            + STRUCTURE_HEIGHTS[STRUCTURE.SHIP_DECK];
          const cx = lx + 0.5, cz = lz + 0.5;
          const mastColor = toColor(BLOCK_COLORS[STRUCTURE.MAST]);
          pushBox(positions, normals, colors, indices,
            cx - 0.06, cx + 0.06, hullTopY, hullTopY + 2.6, cz - 0.06, cz + 0.06, mastColor, 31);
          pushBox(positions, normals, colors, indices,
            x0 + 0.35, x1 - 0.35, hullTopY + 1.0, hullTopY + 1.0 + rh,
            z0 - 0.3, z1 + 0.3, roofColor, 31);
        } else if (roof === STRUCTURE.SHIP_DECK) {
          const deckY = 0.55 + STRUCTURE_HEIGHTS[STRUCTURE.SHIP_HULL];
          pushBox(positions, normals, colors, indices,
            x0, x1, deckY, deckY + rh, z0, z1, roofColor, 31);
        } else if (roof === STRUCTURE.TREE_LEAVES) {
          const cx = lx + 0.5, cz = lz + 0.5;
          const trunkTop = yTop + STRUCTURE_HEIGHTS[STRUCTURE.TREE_TRUNK];
          pushBox(positions, normals, colors, indices,
            cx - 0.55, cx + 0.55, trunkTop, trunkTop + rh,
            cz - 0.55, cz + 0.55, roofColor, 31);
        } else {
          // Building roof: sits at the wall height associated with
          // this roof type, so interior cells lift too.
          const baseY = yTop + (ROOF_BASE_HEIGHT[roof] ?? 2.3);
          let rFlags = 1 | 32;
          if (roofAt(wx, wz - 1) !== roof) rFlags |= 2;
          if (roofAt(wx, wz + 1) !== roof) rFlags |= 4;
          if (roofAt(wx - 1, wz) !== roof) rFlags |= 8;
          if (roofAt(wx + 1, wz) !== roof) rFlags |= 16;
          pushBox(positions, normals, colors, indices,
            x0, x1, baseY, baseY + rh, z0, z1, roofColor, rFlags);
        }
      }

      // Countryside decorations only outside city bounds.
      if (block === BLOCK.GRASS && struct === 0 && roof === 0 && tileHash(wx, wz, 3) < 0.14) {
        addGrassTuft(positions, normals, colors, indices, lx, lz, wx, wz);
      } else if (block === BLOCK.STONE && struct === 0 && tileHash(wx, wz, 5) < 0.08) {
        addPebble(positions, normals, colors, indices, lx, lz, wx, wz);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  const mesh = new THREE.Mesh(geometry, chunkMaterial);
  mesh.position.set(originX * s, 0, originZ * s);
  mesh.name = `chunk_${chunkX}_${chunkZ}`;
  mesh.matrixAutoUpdate = false;
  mesh.updateMatrix();
  return mesh;
}

export function disposeChunkMesh(mesh) {
  if (!mesh) return;
  mesh.geometry?.dispose();
}
