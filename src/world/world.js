import * as THREE from 'three';
import {
  BLOCK,
  CHUNK_SIZE,
  STRUCTURE_PASSABLE,
  TILE_SIZE,
  VIEW_RADIUS_CHUNKS,
  WORLD_SIZE_CHUNKS,
  WORLD_SIZE_TILES,
} from '../config.js';
import { buildChunkMesh, disposeChunkMesh } from './chunk.js';
import { blockAt, isSolid, structureAt } from './terrain.js';

function chunkKey(cx, cz) {
  return `${cx}|${cz}`;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'world';
    this.scene.add(this.group);
    this.loaded = new Map();
    this.lastCenter = { cx: Number.NaN, cz: Number.NaN };
  }

  worldToChunk(tileX, tileZ) {
    return { cx: Math.floor(tileX / CHUNK_SIZE), cz: Math.floor(tileZ / CHUNK_SIZE) };
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

  blockAt(tileX, tileZ) {
    return blockAt(tileX, tileZ);
  }

  isWalkable(tileX, tileZ) {
    if (tileX < 0 || tileZ < 0 || tileX >= WORLD_SIZE_TILES || tileZ >= WORLD_SIZE_TILES) {
      return false;
    }
    const b = blockAt(tileX, tileZ);
    if (b === BLOCK.AIR) return false;
    if (b === BLOCK.WATER) return false;
    const st = structureAt(tileX, tileZ);
    if (st !== 0 && !STRUCTURE_PASSABLE.has(st)) return false;
    return isSolid(tileX, tileZ);
  }

  tileToWorld(tileX, tileZ) {
    return { x: (tileX + 0.5) * TILE_SIZE, z: (tileZ + 0.5) * TILE_SIZE };
  }

  get loadedChunkCount() {
    return this.loaded.size;
  }
}
