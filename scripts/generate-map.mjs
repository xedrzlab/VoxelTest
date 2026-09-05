// Read the authored city data and emit a single-file HTML map so the
// user can see the whole town at once. Includes a tile-color legend,
// a landmark overlay, and street labels.

import { writeFileSync, mkdirSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

import {
  BLOCK,
  CITY_MAX_X, CITY_MAX_Z, CITY_MIN_X, CITY_MIN_Z,
  STRUCTURE,
} from '../src/config.js';
import {
  cityGround, cityStructure, cityRoof, cityProp,
} from '../src/world/city.js';

const W = CITY_MAX_X - CITY_MIN_X;
const H = CITY_MAX_Z - CITY_MIN_Z;
const PX = 10;

function tileColor(wx, wz) {
  const s = cityStructure(wx, wz);
  if (s === STRUCTURE.WALL_CASTLE) return '#3a3c42';
  if (s === STRUCTURE.WALL_STONE) return '#6c6f74';
  if (s === STRUCTURE.WALL_TIMBER) return '#a08a6a';
  if (s === STRUCTURE.WALL_WOOD) return '#6a4a2c';
  if (s === STRUCTURE.FENCE) return '#5a3a20';
  if (s === STRUCTURE.SHIP_HULL) return '#3a2818';
  if (s === STRUCTURE.DOCK_WOOD) return '#7a5028';
  if (s === STRUCTURE.TREE_TRUNK) return '#2c5820';
  if (s === STRUCTURE.FOUNTAIN) return '#a8b8c8';
  const r = cityRoof(wx, wz);
  if (r === STRUCTURE.ROOF_RED) return '#a83c24';
  if (r === STRUCTURE.ROOF_GRAY) return '#54525a';
  if (r === STRUCTURE.ROOF_WHITE) return '#e4dcc8';
  if (r === STRUCTURE.TREE_LEAVES) return '#2c6a2c';
  const g = cityGround(wx, wz);
  switch (g) {
    case BLOCK.WATER: return '#2c64a8';
    case BLOCK.SAND: return '#e2cc8a';
    case BLOCK.GRASS: return '#6aa84a';
    case BLOCK.DIRT: return '#8a5a37';
    case BLOCK.STONE: return '#8a8c8e';
    case BLOCK.ROAD: return '#d6a86a';
    case BLOCK.COBBLE: return '#a89c8a';
    case BLOCK.FLOOR_STONE: return '#c4baa8';
    case BLOCK.FLOOR_WOOD: return '#8a5e30';
    default: return '#7fa04c';
  }
}

// Landmarks placed at LOCAL tile coordinates (city origin = 0,0).
const LANDMARKS = [
  { x: 25, z: 10, label: 'Castle' },
  { x: 42, z: 10, label: 'Royal Army HQ' },
  { x: 17, z: 13, label: 'Church' },
  { x: 34, z: 28, label: 'Temple' },
  { x: 34, z: 37, label: 'Fountain plaza' },
  { x: 51, z: 28, label: "Frodo's Tavern" },
  { x: 24, z: 28, label: 'Depot' },
  { x: 44, z: 28, label: 'Library' },
  { x: 58, z: 8, label: 'Mill' },
  { x: 8, z: 34, label: 'Harbour + Ship' },
  { x: 16, z: 45, label: "Sorcerer's Guild" },
  { x: 30, z: 42, label: 'Alai Flats N' },
  { x: 30, z: 62, label: 'Alai Flats S' },
  { x: 48, z: 46, label: 'Pig pen' },
  { x: 66, z: 34, label: 'East Gate' },
  { x: 34, z: 4, label: 'North Gate' },
  { x: 20, z: 66, label: 'South Gate' },
  { x: 20, z: 40, label: 'West Gate' },
];

const STREETS = [
  { x: 39, z: 34, label: 'Main Street', rotate: 0 },
  { x: 34, z: 20, label: 'Temple St.', rotate: -90 },
  { x: 20, z: 50, label: 'Harbour St.', rotate: -90 },
  { x: 44, z: 45, label: 'Farm Ln.', rotate: -90 },
  { x: 50, z: 20, label: 'Mill Ave.', rotate: -90 },
  { x: 40, z: 58, label: 'Upper Swamp Ln.', rotate: 0 },
  { x: 16, z: 47, label: "Sorcerer's Ave.", rotate: 0 },
];

let rects = '';
for (let z = 0; z < H; z++) {
  for (let x = 0; x < W; x++) {
    const wx = CITY_MIN_X + x;
    const wz = CITY_MIN_Z + z;
    // Overlay props subtly.
    const p = cityProp(wx, wz);
    let color = tileColor(wx, wz);
    if (p === STRUCTURE.LAMPPOST) color = '#f4d868';
    rects += `<rect x="${x * PX}" y="${z * PX}" width="${PX}" height="${PX}" fill="${color}"/>`;
  }
}

function landmark(l) {
  const cx = l.x * PX + PX / 2;
  const cy = l.z * PX + PX / 2;
  return `<circle cx="${cx}" cy="${cy}" r="3.5" fill="#fff" stroke="#000" stroke-width="1.2"/>
    <text x="${cx + 8}" y="${cy + 3.5}" font-size="11" font-family="system-ui,sans-serif"
      fill="#fff" stroke="#000" stroke-width="3" paint-order="stroke"
      style="font-weight:600">${l.label}</text>`;
}
function street(s) {
  const cx = s.x * PX + PX / 2;
  const cy = s.z * PX + PX / 2;
  return `<text x="${cx}" y="${cy}" transform="rotate(${s.rotate ?? 0} ${cx} ${cy})"
      font-size="10" font-family="system-ui,sans-serif" fill="#fff"
      stroke="#111" stroke-width="2.5" paint-order="stroke"
      text-anchor="middle" style="letter-spacing:1px;text-transform:uppercase">${s.label}</text>`;
}

const legendItems = [
  ['#2c64a8', 'Water'],
  ['#e2cc8a', 'Sand'],
  ['#6aa84a', 'Grass'],
  ['#a89c8a', 'Cobble street'],
  ['#d6a86a', 'Country road'],
  ['#3a3c42', 'City wall'],
  ['#6c6f74', 'Stone wall'],
  ['#a08a6a', 'Timber-frame wall'],
  ['#6a4a2c', 'Wood wall (tavern)'],
  ['#a83c24', 'Red-tile roof'],
  ['#54525a', 'Gray castle roof'],
  ['#e4dcc8', 'Temple / church roof'],
  ['#2c6a2c', 'Tree'],
  ['#a8b8c8', 'Fountain'],
  ['#f4d868', 'Lamppost'],
  ['#3a2818', 'Ship hull'],
];

const legend = legendItems.map(([color, name], i) =>
  `<div style="display:flex;align-items:center;gap:8px;font-size:13px">
    <span style="width:16px;height:16px;background:${color};border:1px solid #333;display:inline-block"></span>
    <span>${name}</span>
  </div>`,
).join('');

const html = `<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=6">
<title>VoxelTest — Town Overview</title>
<style>
  html, body { margin: 0; background: #14171c; color: #eee;
    font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
  header { padding: 12px 16px; border-bottom: 1px solid #222; }
  header h1 { margin: 0; font-size: 18px; }
  header p { margin: 4px 0 0; opacity: 0.7; font-size: 13px; }
  main { display: flex; flex-direction: column; padding: 12px; gap: 16px; }
  @media (min-width: 800px) { main { flex-direction: row; } }
  .map { overflow: auto; border: 1px solid #333; background: #0b0d10; padding: 8px; border-radius: 8px; }
  svg { display: block; image-rendering: pixelated; }
  .legend { display: grid; grid-template-columns: 1fr 1fr; gap: 6px;
    max-width: 380px; padding: 12px; background: #191d24;
    border: 1px solid #2a2f37; border-radius: 8px; font-size: 13px; }
  .legend h2 { grid-column: 1 / -1; margin: 0 0 6px; font-size: 14px; opacity: 0.85; }
</style>
<header>
  <h1>VoxelTest — Town Overview</h1>
  <p>Top-down view of the authored ${W}×${H} tile city. North is up.
     Landmarks pinned, streets labelled. Pinch to zoom on mobile.</p>
</header>
<main>
  <div class="map">
    <svg xmlns="http://www.w3.org/2000/svg" width="${W * PX}" height="${H * PX}"
         viewBox="0 0 ${W * PX} ${H * PX}">
      ${rects}
      ${STREETS.map(street).join('\n      ')}
      ${LANDMARKS.map(landmark).join('\n      ')}
    </svg>
  </div>
  <div class="legend">
    <h2>Legend</h2>
    ${legend}
  </div>
</main>
`;

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../scratchpad');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'town-map.html');
writeFileSync(outPath, html);
console.log('Wrote', outPath);
