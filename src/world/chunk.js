import * as THREE from 'three';
import {
  BLOCK,
  BLOCK_COLORS,
  BLOCK_SIDE_TINT,
  CHUNK_SIZE,
  TILE_HEIGHT,
  TILE_SIZE,
} from '../config.js';
import { blockAt, tileHash } from './terrain.js';

const chunkMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

function pushQuad(positions, normals, colors, indices, p0, p1, p2, p3, normal, color) {
  const i = positions.length / 3;
  positions.push(...p0, ...p1, ...p2, ...p3);
  for (let k = 0; k < 4; k++) normals.push(...normal);
  for (let k = 0; k < 4; k++) colors.push(...color);
  // Reversed winding so the calculated face normal matches the supplied
  // vertex normal — otherwise three.js's back-face culling drops every
  // ground face and leaves only the two "wrong-side" faces of each box
  // visible (which is what created the floating-tuft look).
  indices.push(i, i + 2, i + 1, i, i + 3, i + 2);
}

function toColor(rgb, tint = 1) {
  return [(rgb[0] / 255) * tint, (rgb[1] / 255) * tint, (rgb[2] / 255) * tint];
}

/**
 * Add a small decorative box on top of a tile: 5 faces (skip bottom),
 * flat vertex color, at local coords (cx, cz) with the given size.
 */
function pushDecoBox(
  positions,
  normals,
  colors,
  indices,
  cx,
  cz,
  base,
  size,
  color,
) {
  const [w, h, d] = size;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const z0 = cz - d / 2;
  const z1 = cz + d / 2;
  const y0 = base;
  const y1 = base + h;

  // Top
  pushQuad(positions, normals, colors, indices,
    [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
    [0, 1, 0], color);
  // North (-Z)
  pushQuad(positions, normals, colors, indices,
    [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
    [0, 0, -1], color);
  // South (+Z)
  pushQuad(positions, normals, colors, indices,
    [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1],
    [0, 0, 1], color);
  // West (-X)
  pushQuad(positions, normals, colors, indices,
    [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1],
    [-1, 0, 0], color);
  // East (+X)
  pushQuad(positions, normals, colors, indices,
    [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0],
    [1, 0, 0], color);
}

function addGrassTuft(positions, normals, colors, indices, lx, lz, wx, wz) {
  // 2–3 chunky blades of grass sitting on top of the tile. Sized so
  // they're clearly visible on a phone screen at isometric zoom.
  const base = TILE_HEIGHT;
  const ox = (tileHash(wx, wz, 11) - 0.5) * 0.35;
  const oz = (tileHash(wx, wz, 13) - 0.5) * 0.35;
  const bladeColor = toColor([0x38, 0x6d, 0x22]);
  const bladeColor2 = toColor([0x4f, 0x8c, 0x2f]);

  pushDecoBox(
    positions, normals, colors, indices,
    lx + 0.5 + ox, lz + 0.5 + oz, base,
    [0.22, 0.55 + tileHash(wx, wz, 17) * 0.2, 0.22], bladeColor,
  );

  pushDecoBox(
    positions, normals, colors, indices,
    lx + 0.5 + ox + 0.22, lz + 0.5 + oz - 0.14, base,
    [0.16, 0.4, 0.16], bladeColor2,
  );

  if (tileHash(wx, wz, 19) < 0.55) {
    pushDecoBox(
      positions, normals, colors, indices,
      lx + 0.5 + ox - 0.18, lz + 0.5 + oz + 0.16, base,
      [0.14, 0.3, 0.14], bladeColor2,
    );
  }
}

function addPebble(positions, normals, colors, indices, lx, lz, wx, wz) {
  const base = TILE_HEIGHT;
  const ox = (tileHash(wx, wz, 23) - 0.5) * 0.4;
  const oz = (tileHash(wx, wz, 29) - 0.5) * 0.4;
  const color = toColor([0x9a, 0x9d, 0xa0]);
  pushDecoBox(
    positions, normals, colors, indices,
    lx + 0.5 + ox, lz + 0.5 + oz, base,
    [0.16, 0.12, 0.16], color,
  );
}

export function buildChunkMesh(chunkX, chunkZ) {
  const positions = [];
  const normals = [];
  const colors = [];
  const indices = [];

  const originX = chunkX * CHUNK_SIZE;
  const originZ = chunkZ * CHUNK_SIZE;

  const h = TILE_HEIGHT;
  const s = TILE_SIZE;

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = originX + lx;
      const wz = originZ + lz;
      const block = blockAt(wx, wz);
      if (block === BLOCK.AIR) continue;

      const baseRGB = BLOCK_COLORS[block] ?? [255, 0, 255];
      const topColor = toColor(baseRGB, 1.0);
      const sideColor = toColor(baseRGB, BLOCK_SIDE_TINT);

      const x0 = lx * s;
      const x1 = x0 + s;
      const z0 = lz * s;
      const z1 = z0 + s;
      const y0 = 0;
      const y1 = h;

      pushQuad(positions, normals, colors, indices,
        [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1],
        [0, 1, 0], topColor);

      if (blockAt(wx, wz - 1) === BLOCK.AIR) {
        pushQuad(positions, normals, colors, indices,
          [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
          [0, 0, -1], sideColor);
      }
      if (blockAt(wx, wz + 1) === BLOCK.AIR) {
        pushQuad(positions, normals, colors, indices,
          [x1, y0, z1], [x0, y0, z1], [x0, y1, z1], [x1, y1, z1],
          [0, 0, 1], sideColor);
      }
      if (blockAt(wx - 1, wz) === BLOCK.AIR) {
        pushQuad(positions, normals, colors, indices,
          [x0, y0, z1], [x0, y0, z0], [x0, y1, z0], [x0, y1, z1],
          [-1, 0, 0], sideColor);
      }
      if (blockAt(wx + 1, wz) === BLOCK.AIR) {
        pushQuad(positions, normals, colors, indices,
          [x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0],
          [1, 0, 0], sideColor);
      }

      // Decorations sitting on top of the tile.
      if (block === BLOCK.GRASS && tileHash(wx, wz, 3) < 0.16) {
        addGrassTuft(positions, normals, colors, indices, lx, lz, wx, wz);
      } else if (block === BLOCK.STONE && tileHash(wx, wz, 5) < 0.08) {
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
