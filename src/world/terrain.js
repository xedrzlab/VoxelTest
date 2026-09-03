import { createNoise2D } from 'simplex-noise';
import { BLOCK, WORLD_SIZE_TILES } from '../config.js';

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(1337);
const noiseA = createNoise2D(rng);
const noiseB = createNoise2D(rng);

const SCALE_A = 1 / 18;
const SCALE_B = 1 / 6;

const CENTER = WORLD_SIZE_TILES / 2;

// Two winding roads: one running east-west, one north-south, meeting
// near the center. Width defined by distance to the road spine.
function roadDistance(x, z) {
  const spineEW = CENTER + Math.sin(x * 0.08) * 6 + Math.sin(x * 0.02) * 4;
  const spineNS = CENTER + Math.cos(z * 0.07) * 5 + Math.sin(z * 0.02) * 3;
  const dEW = Math.abs(z - spineEW);
  const dNS = Math.abs(x - spineNS);
  return Math.min(dEW, dNS);
}

export function isRoad(x, z) {
  return roadDistance(x, z) < 1.5;
}

function roadEdge(x, z) {
  // A slightly wider band for scuffed dirt shoulder around the road.
  const d = roadDistance(x, z);
  return d >= 1.5 && d < 2.4;
}

export function blockAt(worldX, worldZ) {
  if (worldX < 0 || worldZ < 0 || worldX >= WORLD_SIZE_TILES || worldZ >= WORLD_SIZE_TILES) {
    return BLOCK.AIR;
  }
  if (isRoad(worldX, worldZ)) return BLOCK.ROAD;
  if (roadEdge(worldX, worldZ)) return BLOCK.DIRT;

  const n = noiseA(worldX * SCALE_A, worldZ * SCALE_A);
  const detail = noiseB(worldX * SCALE_B, worldZ * SCALE_B) * 0.25;
  const v = n + detail;
  if (v < -0.35) return BLOCK.STONE;
  if (v < -0.05) return BLOCK.DIRT;
  return BLOCK.GRASS;
}

export function isSolid(worldX, worldZ) {
  return blockAt(worldX, worldZ) !== BLOCK.AIR;
}

// Deterministic 0..1 hash for a tile — used for decoration placement.
export function tileHash(x, z, salt = 0) {
  let h = (x * 374761393 + z * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
