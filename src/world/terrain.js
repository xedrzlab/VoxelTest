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

export function blockAt(worldX, worldZ) {
  if (worldX < 0 || worldZ < 0 || worldX >= WORLD_SIZE_TILES || worldZ >= WORLD_SIZE_TILES) {
    return BLOCK.AIR;
  }
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
