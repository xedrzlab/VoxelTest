import * as THREE from 'three';
import {
  BLOCK,
  BLOCK_COLORS,
  BLOCK_SIDE_TINT,
  CHUNK_SIZE,
  TILE_HEIGHT,
  TILE_SIZE,
} from '../config.js';
import { blockAt } from './terrain.js';

const chunkMaterial = new THREE.MeshLambertMaterial({
  vertexColors: true,
  flatShading: true,
});

function pushQuad(positions, normals, colors, indices, p0, p1, p2, p3, normal, color) {
  const i = positions.length / 3;
  positions.push(...p0, ...p1, ...p2, ...p3);
  for (let k = 0; k < 4; k++) normals.push(...normal);
  for (let k = 0; k < 4; k++) colors.push(...color);
  indices.push(i, i + 1, i + 2, i, i + 2, i + 3);
}

function toColor(rgb, tint = 1) {
  return [(rgb[0] / 255) * tint, (rgb[1] / 255) * tint, (rgb[2] / 255) * tint];
}

/**
 * Build a mesh for one chunk using face culling: only faces not
 * touching another solid block become geometry. With a single flat
 * layer this drops all internal side faces and every bottom face.
 */
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

      // Top face (always visible in single-layer world)
      pushQuad(
        positions,
        normals,
        colors,
        indices,
        [x0, y1, z0],
        [x1, y1, z0],
        [x1, y1, z1],
        [x0, y1, z1],
        [0, 1, 0],
        topColor,
      );

      // Side faces — only where the neighboring tile is not solid
      // In a flat world that's only at the world border, but this
      // stays correct if we later allow air tiles inside the world.
      const nNorth = blockAt(wx, wz - 1);
      if (nNorth === BLOCK.AIR) {
        pushQuad(
          positions,
          normals,
          colors,
          indices,
          [x0, y0, z0],
          [x1, y0, z0],
          [x1, y1, z0],
          [x0, y1, z0],
          [0, 0, -1],
          sideColor,
        );
      }

      const nSouth = blockAt(wx, wz + 1);
      if (nSouth === BLOCK.AIR) {
        pushQuad(
          positions,
          normals,
          colors,
          indices,
          [x1, y0, z1],
          [x0, y0, z1],
          [x0, y1, z1],
          [x1, y1, z1],
          [0, 0, 1],
          sideColor,
        );
      }

      const nWest = blockAt(wx - 1, wz);
      if (nWest === BLOCK.AIR) {
        pushQuad(
          positions,
          normals,
          colors,
          indices,
          [x0, y0, z1],
          [x0, y0, z0],
          [x0, y1, z0],
          [x0, y1, z1],
          [-1, 0, 0],
          sideColor,
        );
      }

      const nEast = blockAt(wx + 1, wz);
      if (nEast === BLOCK.AIR) {
        pushQuad(
          positions,
          normals,
          colors,
          indices,
          [x1, y0, z0],
          [x1, y0, z1],
          [x1, y1, z1],
          [x1, y1, z0],
          [1, 0, 0],
          sideColor,
        );
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
  // material is shared, do not dispose
}
