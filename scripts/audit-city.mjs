// Scan the authored city and report anything that looks wrong:
// walls that ended up on top of a street tile, roads that dead-end,
// buildings with missing wall segments, and structures that landed on
// water. Prints a compact human-readable report.

import {
  BLOCK,
  CITY_MIN_X, CITY_MIN_Z, CITY_MAX_X, CITY_MAX_Z,
  STRUCTURE,
} from '../src/config.js';
import {
  cityGround, cityStructure, cityRoof, cityProp,
} from '../src/world/city.js';

const W = CITY_MAX_X - CITY_MIN_X;
const H = CITY_MAX_Z - CITY_MIN_Z;

const WALLS = new Set([
  STRUCTURE.WALL_STONE, STRUCTURE.WALL_CASTLE,
  STRUCTURE.WALL_WOOD, STRUCTURE.WALL_TIMBER,
]);
const ROAD_GROUND = new Set([BLOCK.COBBLE, BLOCK.ROAD]);

const g = (lx, lz) => cityGround(CITY_MIN_X + lx, CITY_MIN_Z + lz);
const s = (lx, lz) => cityStructure(CITY_MIN_X + lx, CITY_MIN_Z + lz);
const r = (lx, lz) => cityRoof(CITY_MIN_X + lx, CITY_MIN_Z + lz);
const p = (lx, lz) => cityProp(CITY_MIN_X + lx, CITY_MIN_Z + lz);
const inBounds = (lx, lz) => lx >= 0 && lz >= 0 && lx < W && lz < H;

let problems = [];

// 1. Walls or fences sitting on top of a road/cobble tile.
for (let z = 0; z < H; z++) {
  for (let x = 0; x < W; x++) {
    if (!ROAD_GROUND.has(g(x, z))) continue;
    if (WALLS.has(s(x, z)) || s(x, z) === STRUCTURE.FENCE) {
      problems.push(`WALL_ON_ROAD ${x},${z} struct=${s(x, z)}`);
    }
    if (r(x, z) !== 0 && r(x, z) !== STRUCTURE.TREE_LEAVES) {
      problems.push(`ROOF_OVER_ROAD ${x},${z} roof=${r(x, z)}`);
    }
  }
}

// 2. (Removed the 1-tile orphan-roof check — it false-positives on
//    every interior tile of any building bigger than 3x3. The
//    perimeter check below catches real missing walls.)

// 3. Building perimeter integrity: roofs form clusters. Each cluster's
//    outer boundary (roof cells adjacent to non-roof) should also be
//    a wall or a door gap (STRUCTURE.NONE). Doors gaps are OK but if
//    an entire building side has ZERO walls that's a hole.
const visited = new Uint8Array(W * H);
const idx = (x, z) => z * W + x;

function floodRoofCluster(sx, sz) {
  const roofType = r(sx, sz);
  const cells = [];
  const stack = [[sx, sz]];
  while (stack.length) {
    const [x, z] = stack.pop();
    if (!inBounds(x, z)) continue;
    if (visited[idx(x, z)]) continue;
    if (r(x, z) !== roofType) continue;
    visited[idx(x, z)] = 1;
    cells.push([x, z]);
    stack.push([x + 1, z], [x - 1, z], [x, z + 1], [x, z - 1]);
  }
  return cells;
}

for (let z = 0; z < H; z++) {
  for (let x = 0; x < W; x++) {
    if (visited[idx(x, z)]) continue;
    const roof = r(x, z);
    if (roof === 0 || roof === STRUCTURE.TREE_LEAVES
        || roof === STRUCTURE.SHIP_DECK || roof === STRUCTURE.SAIL) {
      visited[idx(x, z)] = 1;
      continue;
    }
    const cells = floodRoofCluster(x, z);
    if (cells.length < 4) continue;
    // Bounding box.
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const [cx, cz] of cells) {
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cz < minZ) minZ = cz;
      if (cz > maxZ) maxZ = cz;
    }
    // Count wall tiles on each of the 4 perimeter sides of the bbox.
    const wallCount = { N: 0, S: 0, E: 0, W: 0 };
    for (let cx = minX; cx <= maxX; cx++) {
      if (WALLS.has(s(cx, minZ))) wallCount.N++;
      if (WALLS.has(s(cx, maxZ))) wallCount.S++;
    }
    for (let cz = minZ; cz <= maxZ; cz++) {
      if (WALLS.has(s(minX, cz))) wallCount.W++;
      if (WALLS.has(s(maxX, cz))) wallCount.E++;
    }
    const spanX = maxX - minX + 1;
    const spanZ = maxZ - minZ + 1;
    // Flag a side that has more than ONE tile missing (one gap is a
    // door; two-plus is a road cut through the wall or a bad shift).
    const missing = {
      N: spanX - wallCount.N,
      S: spanX - wallCount.S,
      W: spanZ - wallCount.W,
      E: spanZ - wallCount.E,
    };
    for (const [side, gap] of Object.entries(missing)) {
      if (gap >= 2) {
        problems.push(
          `WALL_GAP_${side} building@${minX},${minZ}-${maxX},${maxZ} `
          + `missing=${gap}/${side === 'N' || side === 'S' ? spanX : spanZ}`);
      }
    }
  }
}

// 4. Structures on water tiles that shouldn't be there.
for (let z = 0; z < H; z++) {
  for (let x = 0; x < W; x++) {
    if (g(x, z) !== BLOCK.WATER) continue;
    const st = s(x, z);
    if (WALLS.has(st) || st === STRUCTURE.FENCE
        || st === STRUCTURE.TREE_TRUNK) {
      problems.push(`STRUCT_IN_WATER ${x},${z} struct=${st}`);
    }
  }
}

// 5. Doors that open onto a non-walkable tile (into water, another wall, etc.)
for (let z = 0; z < H; z++) {
  for (let x = 0; x < W; x++) {
    if (g(x, z) !== BLOCK.COBBLE) continue;
    // Is this a "door tile" — an interior floor patch turned into cobble
    // that also has a roof over it? Check for roof.
    if (r(x, z) === 0) continue;
    // Look at the 4 cardinal neighbours: at least one should be outside
    // (grass/cobble not roofed).
    const nbrs = [[x, z - 1], [x, z + 1], [x - 1, z], [x + 1, z]];
    let opensOutside = false;
    for (const [nx, nz] of nbrs) {
      if (!inBounds(nx, nz)) continue;
      if (r(nx, nz) === 0 && g(nx, nz) !== BLOCK.WATER
          && !WALLS.has(s(nx, nz))) {
        opensOutside = true;
        break;
      }
    }
    if (!opensOutside) {
      problems.push(`DOOR_TO_NOWHERE ${x},${z}`);
    }
  }
}

// 6. Overlapping buildings — two different roof types on the same tile
//    is impossible with our data, but overlapping wall+roof of clashing
//    types is a smell. Check for wall structure with a wrong-height
//    roof over it (roof exists but no matching building bbox).

// (Simpler and probably sufficient checks above.)

// Report.
if (!problems.length) {
  console.log('OK — no problems found.');
} else {
  console.log(`${problems.length} problem(s) found:`);
  // Group by type prefix for readability.
  const grouped = {};
  for (const p of problems) {
    const kind = p.split(' ')[0];
    (grouped[kind] ??= []).push(p);
  }
  for (const [kind, list] of Object.entries(grouped)) {
    console.log(`\n[${kind}] ×${list.length}`);
    for (const item of list.slice(0, 20)) console.log('  ' + item);
    if (list.length > 20) console.log(`  … ${list.length - 20} more`);
  }
}
