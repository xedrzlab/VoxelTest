import { createNoise2D } from 'simplex-noise';
import { BLOCK, WORLD_SIZE_TILES } from '../config.js';
import {
  cityChimney,
  cityGround,
  cityProp,
  cityRoof,
  cityStructure,
  isInCity,
} from './city.js';

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

function outerRoadDistance(x, z) {
  const dxc = x - CENTER;
  const dzc = z - CENTER;
  const spineEW = CENTER + Math.sin(dxc * 0.08) * 6 + Math.sin(dxc * 0.02) * 4;
  const spineNS = CENTER + Math.cos(dzc * 0.07) * 5 + Math.sin(dzc * 0.02) * 3;
  return Math.min(Math.abs(z - spineEW), Math.abs(x - spineNS));
}

export function blockAt(worldX, worldZ) {
  if (worldX < 0 || worldZ < 0 || worldX >= WORLD_SIZE_TILES || worldZ >= WORLD_SIZE_TILES) {
    return BLOCK.AIR;
  }
  if (isInCity(worldX, worldZ)) {
    const g = cityGround(worldX, worldZ);
    if (g !== 0) return g;
  }
  // Country roads leading out of the city.
  const d = outerRoadDistance(worldX, worldZ);
  if (d < 1.8) return BLOCK.ROAD;
  if (d < 2.8) return BLOCK.DIRT;

  const n = noiseA(worldX * SCALE_A, worldZ * SCALE_A);
  const detail = noiseB(worldX * SCALE_B, worldZ * SCALE_B) * 0.25;
  const v = n + detail;
  if (v < -0.35) return BLOCK.STONE;
  if (v < -0.05) return BLOCK.DIRT;
  return BLOCK.GRASS;
}

export function structureAt(worldX, worldZ) {
  if (!isInCity(worldX, worldZ)) return 0;
  return cityStructure(worldX, worldZ);
}

export function roofAt(worldX, worldZ) {
  if (!isInCity(worldX, worldZ)) return 0;
  return cityRoof(worldX, worldZ);
}

export function propAt(worldX, worldZ) {
  if (!isInCity(worldX, worldZ)) return 0;
  return cityProp(worldX, worldZ);
}

export function chimneyAt(worldX, worldZ) {
  if (!isInCity(worldX, worldZ)) return 0;
  return cityChimney(worldX, worldZ);
}

export function isSolid(worldX, worldZ) {
  return blockAt(worldX, worldZ) !== BLOCK.AIR;
}

export function tileHash(x, z, salt = 0) {
  let h = (x * 374761393 + z * 668265263 + salt * 2246822519) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
