import * as THREE from 'three';
import {
  CHUNK_SIZE,
  TILE_SIZE,
  VIEW_RADIUS_CHUNKS,
  WORLD_SIZE_CHUNKS,
  WORLD_SIZE_TILES,
} from '../config.js';
import { buildChunkMesh, disposeChunkMesh } from './chunk.js';
import { isSolid } from './terrain.js';

function chunkKey(cx, cz) {
  return `${cx}|${cz}`;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'world';
    this.scene.add(this.group);
    /** @type {Map<string, THREE.Mesh>} */
    this.loaded = new Map();
    this.lastCenter = { cx: Number.NaN, cz: Number.NaN };
  }

  worldToChunk(tileX, tileZ) {
    return {
      cx: Math.floor(tileX / CHUNK_SIZE),
      cz: Math.floor(tileZ / CHUNK_SIZE),
    };
  }

  update(playerTileX, playerTileZ) {
    const { cx, cz } = this.worldToChunk(playerTileX, playerTileZ);
    if (cx === this.lastCenter.cx && cz === this.lastCenter.cz) return;
    this.lastCenter = { cx, cz };

    const needed = new Set();
    for (let dz = -VIEW_RADIUS_CHUNKS; dz <= VIEW_RADIUS_CHUNKS; dz++) {
      for (let dx = -VIEW_RADIUS_CHUNKS; dx <= VIEW_RADIUS_CHUNKS; dx++) {
        const ccx = cx + dx;
        const ccz = cz + dz;
        if (ccx < 0 || ccz < 0 || ccx >= WORLD_SIZE_CHUNKS || ccz >= WORLD_SIZE_CHUNKS) continue;
        const key = chunkKey(ccx, ccz);
        needed.add(key);
        if (!this.loaded.has(key)) {
          const mesh = buildChunkMesh(ccx, ccz);
          this.loaded.set(key, mesh);
          this.group.add(mesh);
        }
      }
    }

    for (const [key, mesh] of this.loaded) {
      if (!needed.has(key)) {
        this.group.remove(mesh);
        disposeChunkMesh(mesh);
        this.loaded.delete(key);
      }
    }
  }

  isWalkable(tileX, tileZ) {
    if (tileX < 0 || tileZ < 0 || tileX >= WORLD_SIZE_TILES || tileZ >= WORLD_SIZE_TILES) {
      return false;
    }
    return isSolid(tileX, tileZ);
  }

  tileToWorld(tileX, tileZ) {
    return {
      x: (tileX + 0.5) * TILE_SIZE,
      z: (tileZ + 0.5) * TILE_SIZE,
    };
  }

  get loadedChunkCount() {
    return this.loaded.size;
  }
}
