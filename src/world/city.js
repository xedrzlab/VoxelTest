import {
  BLOCK,
  CITY_MAX_X,
  CITY_MAX_Z,
  CITY_MIN_X,
  CITY_MIN_Z,
  STRUCTURE,
} from '../config.js';

// Authored Thais-flavored city. Everything is baked into two flat
// arrays indexed by (x - CITY_MIN_X, z - CITY_MIN_Z). Outside the
// bounds the world falls back to procedural terrain.

const W = CITY_MAX_X - CITY_MIN_X;
const H = CITY_MAX_Z - CITY_MIN_Z;

const ground = new Uint8Array(W * H);
const structure = new Uint8Array(W * H);
// Roof cells: painted after walls so we can lift a full building's roof
// on top of its interior floor as a separate structure block.
const roof = new Uint8Array(W * H);
// Small decorations layered onto tiles (chimneys, lampposts, barrels,
// flowers, bushes) that render on top of ground and don't replace walls.
const prop = new Uint8Array(W * H);
// Chimneys need to sit on TOP of the roof, so we store them separately
// from prop (props are on-ground) and let the mesher render them above
// the roof height for that building.
const chimney = new Uint8Array(W * H);

function idx(lx, lz) {
  return lz * W + lx;
}

function inBounds(lx, lz) {
  return lx >= 0 && lz >= 0 && lx < W && lz < H;
}

function setGround(lx, lz, b) {
  if (inBounds(lx, lz)) ground[idx(lx, lz)] = b;
}

function setStructure(lx, lz, s) {
  if (inBounds(lx, lz)) structure[idx(lx, lz)] = s;
}

function setRoof(lx, lz, r) {
  if (inBounds(lx, lz)) roof[idx(lx, lz)] = r;
}

function setProp(lx, lz, p) {
  if (inBounds(lx, lz)) prop[idx(lx, lz)] = p;
}

function setChimney(lx, lz, c) {
  if (inBounds(lx, lz)) chimney[idx(lx, lz)] = c;
}

function fillRect(x0, z0, x1, z1, b) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) setGround(x, z, b);
}

function strokeRect(x0, z0, x1, z1, s) {
  for (let x = x0; x <= x1; x++) {
    setStructure(x, z0, s);
    setStructure(x, z1, s);
  }
  for (let z = z0; z <= z1; z++) {
    setStructure(x0, z, s);
    setStructure(x1, z, s);
  }
}

function fillRoof(x0, z0, x1, z1, r) {
  for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) setRoof(x, z, r);
}

/**
 * Build a house: perimeter walls of `wall`, interior floor of `floor`,
 * roof over the whole footprint of `roofType`. Door is a gap in the
 * perimeter at the given side ('N'|'S'|'E'|'W') and offset from x0/z0.
 */
function building(x0, z0, x1, z1, wall, roofType, floor = BLOCK.FLOOR_WOOD, door = null) {
  fillRect(x0, z0, x1, z1, floor);
  strokeRect(x0, z0, x1, z1, wall);
  fillRoof(x0, z0, x1, z1, roofType);

  // Chimney at one of the interior corners so it sits ON the roof.
  const cx = x0 + 1;
  const cz = z0 + 1;
  if (cx < x1 && cz < z1) setChimney(cx, cz, STRUCTURE.CHIMNEY);

  if (door) {
    const [side, off] = door;
    let dx = 0, dz = 0;
    if (side === 'N') { dx = x0 + off; dz = z0; }
    if (side === 'S') { dx = x0 + off; dz = z1; }
    if (side === 'W') { dx = x0; dz = z0 + off; }
    if (side === 'E') { dx = x1; dz = z0 + off; }
    setStructure(dx, dz, STRUCTURE.NONE);
    // Paint the doorway ground so it reads as an entry, and drop a
    // couple of props flanking the door on the outside.
    setGround(dx, dz, BLOCK.COBBLE);
    const outside = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[side];
    const [ox, oz] = outside;
    // Alternate props so different buildings feel different.
    const salt = (dx * 73 + dz * 149) & 3;
    if (salt === 0) {
      setProp(dx + ox, dz + oz, STRUCTURE.LAMPPOST);
    } else if (salt === 1) {
      setProp(dx + ox + oz, dz + oz + ox, STRUCTURE.BARREL);
      setProp(dx + ox - oz, dz + oz - ox, STRUCTURE.FLOWER_POT);
    } else if (salt === 2) {
      setProp(dx + ox + oz, dz + oz + ox, STRUCTURE.CRATE);
      setProp(dx + ox - oz, dz + oz - ox, STRUCTURE.LAMPPOST);
    } else {
      setProp(dx + ox + oz, dz + oz + ox, STRUCTURE.FLOWER_POT);
      setProp(dx + ox - oz, dz + oz - ox, STRUCTURE.BUSH);
    }
  }
}

function tree(lx, lz) {
  setStructure(lx, lz, STRUCTURE.TREE_TRUNK);
  // Leaves painted as a roof so they appear stacked on top of the trunk.
  setRoof(lx, lz, STRUCTURE.TREE_LEAVES);
}

function build() {
  // ── Base terrain fill ────────────────────────────────────────────
  // Everything inside the city bounds starts as grass.
  fillRect(0, 0, W - 1, H - 1, BLOCK.GRASS);

  // ── Water: bay on the west, rivers north and south. ──────────────
  // West bay — the harbour opens onto it.
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < 12; x++) setGround(x, z, BLOCK.WATER);
  }
  // Southern shoreline of the bay — wavy sand strip.
  for (let z = 0; z < H; z++) {
    const shore = 12 + Math.round(Math.sin(z * 0.3) * 1.5);
    setGround(shore, z, BLOCK.SAND);
    setGround(shore + 1, z, BLOCK.SAND);
  }
  // Northern river — thin band along top edge.
  for (let x = 0; x < W; x++) {
    for (let z = 0; z < 3; z++) setGround(x, z, BLOCK.WATER);
    setGround(x, 3, BLOCK.SAND);
  }
  // Southern river.
  for (let x = 0; x < W; x++) {
    for (let z = H - 3; z < H; z++) setGround(x, z, BLOCK.WATER);
    setGround(x, H - 4, BLOCK.SAND);
  }

  // ── Street network (relative coords) ─────────────────────────────
  // World tile 64 = local 34 for our CITY_MIN_X=30 bounds.
  const MS_Z = 34; // Main Street row
  const TS_X = 34; // Temple Street column
  const HS_X = 20; // Harbour Street column
  const FL_X = 44; // Farm Lane column
  const MA_X = 50; // Mill Avenue column (north half)

  // Main Street: horizontal spine, harbour to east gate.
  for (let x = 12; x <= 66; x++) {
    for (let dz = -2; dz <= 2; dz++) setGround(x, MS_Z + dz, BLOCK.COBBLE);
  }
  // Temple Street: north-south central axis.
  for (let z = 4; z <= MS_Z; z++) {
    for (let dx = -2; dx <= 2; dx++) setGround(TS_X + dx, z, BLOCK.COBBLE);
  }
  // Harbour Street.
  for (let z = MS_Z; z <= H - 5; z++) {
    for (let dx = -1; dx <= 1; dx++) setGround(HS_X + dx, z, BLOCK.COBBLE);
  }
  // Farm Lane.
  for (let z = MS_Z; z <= H - 12; z++) {
    setGround(FL_X, z, BLOCK.COBBLE);
    setGround(FL_X + 1, z, BLOCK.COBBLE);
  }
  // Mill Avenue.
  for (let z = 4; z <= MS_Z; z++) {
    setGround(MA_X, z, BLOCK.COBBLE);
    setGround(MA_X + 1, z, BLOCK.COBBLE);
  }
  // Upper Swamp Lane — east-west road across the south district.
  for (let x = HS_X; x <= 60; x++) {
    setGround(x, H - 12, BLOCK.COBBLE);
    setGround(x, H - 11, BLOCK.COBBLE);
  }
  // Lower Swamp Lane.
  for (let x = HS_X; x <= 55; x++) {
    setGround(x, H - 7, BLOCK.COBBLE);
  }
  // Sorcerer's Avenue — east-west, southwest of temple.
  for (let x = 14; x <= HS_X + 4; x++) {
    setGround(x, MS_Z + 12, BLOCK.COBBLE);
    setGround(x, MS_Z + 13, BLOCK.COBBLE);
  }

  // ── Eastern city wall (heavy stone), continuous with gates ───────
  const EAST = 66;
  for (let z = 4; z <= H - 4; z++) {
    setStructure(EAST, z, STRUCTURE.WALL_CASTLE);
    setStructure(EAST + 1, z, STRUCTURE.WALL_CASTLE);
  }
  // East Gate on Main Street row.
  for (let z = MS_Z - 1; z <= MS_Z + 1; z++) {
    setStructure(EAST, z, STRUCTURE.NONE);
    setStructure(EAST + 1, z, STRUCTURE.NONE);
    setGround(EAST, z, BLOCK.COBBLE);
    setGround(EAST + 1, z, BLOCK.COBBLE);
    setGround(EAST + 2, z, BLOCK.ROAD);
    setGround(EAST + 3, z, BLOCK.ROAD);
    setGround(EAST + 4, z, BLOCK.ROAD);
  }

  // ── North wall + North Gate ──────────────────────────────────────
  for (let x = 12; x <= EAST + 1; x++) {
    setStructure(x, 4, STRUCTURE.WALL_CASTLE);
  }
  for (let dx = -1; dx <= 1; dx++) {
    setStructure(TS_X + dx, 4, STRUCTURE.NONE);
    setGround(TS_X + dx, 4, BLOCK.COBBLE);
    setGround(TS_X + dx, 3, BLOCK.COBBLE);
    setGround(TS_X + dx, 2, BLOCK.ROAD);
  }

  // ── South wall + South Gate ──────────────────────────────────────
  for (let x = 12; x <= EAST + 1; x++) {
    setStructure(x, H - 4, STRUCTURE.WALL_CASTLE);
  }
  for (let dx = -1; dx <= 1; dx++) {
    setStructure(HS_X + dx, H - 4, STRUCTURE.NONE);
    setGround(HS_X + dx, H - 4, BLOCK.COBBLE);
    setGround(HS_X + dx, H - 3, BLOCK.COBBLE);
    setGround(HS_X + dx, H - 2, BLOCK.ROAD);
  }

  // ── West Gate onto the harbour bridge ────────────────────────────
  // Small stone dock on the shore, then a wooden bridge across water.
  for (let dz = -2; dz <= 2; dz++) {
    setGround(HS_X, MS_Z + 6 + dz, BLOCK.COBBLE);
    for (let x = HS_X - 1; x >= 13; x--) {
      setGround(x, MS_Z + 6 + dz, BLOCK.SAND);
    }
  }

  // ── Harbour: dock planks along the shore, ship in the bay ────────
  for (let z = MS_Z - 3; z <= MS_Z + 8; z++) {
    setStructure(13, z, STRUCTURE.DOCK_WOOD);
    setStructure(14, z, STRUCTURE.DOCK_WOOD);
  }
  // Ship hull (~10x3), moored just off the dock.
  const shipX = 5;
  const shipZ = MS_Z - 4;
  for (let z = 0; z < 10; z++) {
    for (let x = 0; x < 3; x++) {
      setStructure(shipX + x, shipZ + z, STRUCTURE.SHIP_HULL);
    }
  }
  // Deck strip on top (rendered as roof over the hull cells).
  for (let z = 1; z < 9; z++) {
    for (let x = 0; x < 3; x++) {
      setRoof(shipX + x, shipZ + z, STRUCTURE.SHIP_DECK);
    }
  }
  // Sail on the middle deck tile — mast is drawn by chunk.js from the
  // deck up when it sees a SAIL roof.
  setRoof(shipX + 1, shipZ + 4, STRUCTURE.SAIL);

  // ── Castle district (NW) ─────────────────────────────────────────
  // Big castle keep with thicker walls and gray roof.
  building(20, 6, 30, 14, STRUCTURE.WALL_CASTLE, STRUCTURE.ROOF_GRAY, BLOCK.FLOOR_STONE, ['S', 5]);
  // Castle courtyard cobble in front.
  fillRect(21, 15, 29, 18, BLOCK.COBBLE);
  // Watchtowers at the castle corners (bumped up as extra wall stubs).
  setStructure(20, 6, STRUCTURE.WALL_CASTLE);
  setStructure(30, 6, STRUCTURE.WALL_CASTLE);
  // Royal Army HQ next door.
  building(32, 6, 40, 13, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_STONE, ['S', 4]);
  // Church.
  building(15, 10, 19, 16, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE, BLOCK.FLOOR_STONE, ['S', 2]);

  // ── Northern shops along Temple Street ───────────────────────────
  building(24, 20, 30, 26, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['E', 3]);
  building(38, 20, 44, 26, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['W', 3]);

  // ── Mill Avenue district (NE) ────────────────────────────────────
  building(46, 8, 52, 14, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['S', 3]);
  building(54, 8, 62, 14, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['S', 4]);
  building(46, 18, 52, 26, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['S', 3]);
  building(54, 18, 62, 26, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['S', 4]);
  // Mill: circular-ish stone building next to Mill Avenue.
  building(56, 6, 60, 10, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_STONE, ['S', 2]);

  // ── Central temple, right on Main/Temple Street junction ─────────
  building(29, 28, 39, 32, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE, BLOCK.FLOOR_STONE, ['S', 5]);
  // Fountain in the plaza south of the temple.
  setStructure(34, 36, STRUCTURE.FOUNTAIN);
  setStructure(35, 36, STRUCTURE.FOUNTAIN);
  setStructure(34, 37, STRUCTURE.FOUNTAIN);
  setStructure(35, 37, STRUCTURE.FOUNTAIN);

  // ── Depot / library / games hall clustered around the temple ────
  building(22, 28, 27, 32, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['E', 2]);
  building(41, 28, 46, 32, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['W', 2]);
  building(41, 20, 46, 26, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['S', 2]);

  // ── Frodo's Tavern & shops east of temple ───────────────────────
  building(48, 28, 55, 32, STRUCTURE.WALL_WOOD, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['S', 3]);
  building(57, 28, 62, 32, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['S', 2]);

  // ── East wall houses row ────────────────────────────────────────
  for (let z = 6; z <= H - 8; z += 6) {
    if (z >= MS_Z - 3 && z <= MS_Z + 3) continue; // don't block the gate
    building(60, z, 65, z + 4, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['W', 2]);
  }

  // ── Southern residential (Alai Flats — big dense complex) ───────
  // Two long apartment blocks running along Upper Swamp Lane.
  building(22, MS_Z + 4, 38, MS_Z + 9, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['N', 8]);
  building(22, H - 10, 38, H - 5, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['N', 8]);
  // Interior walls to make it read as separated apartments.
  for (let x = 26; x <= 36; x += 4) {
    for (let z = MS_Z + 5; z <= MS_Z + 8; z++) setStructure(x, z, STRUCTURE.WALL_STONE);
    for (let z = H - 9; z <= H - 6; z++) setStructure(x, z, STRUCTURE.WALL_STONE);
  }
  // Row of smaller houses south of Main Street, east of Alai Flats.
  building(40, MS_Z + 4, 46, MS_Z + 9, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['N', 3]);
  building(48, MS_Z + 4, 54, MS_Z + 9, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['N', 3]);
  building(56, MS_Z + 4, 62, MS_Z + 9, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, ['N', 3]);
  // Farm-lane pig enclosure (small fence rectangle).
  strokeRect(FL_X + 3, MS_Z + 5, FL_X + 6, MS_Z + 8, STRUCTURE.FENCE);
  setGround(FL_X + 4, MS_Z + 6, BLOCK.DIRT);
  setGround(FL_X + 5, MS_Z + 6, BLOCK.DIRT);
  setGround(FL_X + 4, MS_Z + 7, BLOCK.DIRT);
  setGround(FL_X + 5, MS_Z + 7, BLOCK.DIRT);

  // ── Sorcerer's district (SW) ────────────────────────────────────
  building(16, MS_Z + 8, 22, MS_Z + 14, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE, BLOCK.FLOOR_STONE, ['N', 3]);
  building(16, MS_Z + 16, 22, MS_Z + 22, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE, BLOCK.FLOOR_STONE, ['N', 3]);

  // ── Trees scattered inside grassy pockets of the city ───────────
  const treeSpots = [
    [26, 34], [26, 35], [40, 34], [41, 34],
    [30, 20], [37, 21], [45, 28], [52, 27],
    [22, 25], [16, 26], [64, 45], [64, 48],
    [50, 45], [52, 46], [30, 44], [28, 45],
    [43, 44], [45, 45], [58, 45], [60, 45],
    [22, MS_Z + 22], [24, MS_Z + 24],
  ];
  for (const [x, z] of treeSpots) {
    if (ground[idx(x, z)] === BLOCK.GRASS && structure[idx(x, z)] === 0) tree(x, z);
  }

  // ── Street lamps along Main Street and Temple Street ────────────
  for (let x = HS_X + 4; x < EAST; x += 6) {
    setProp(x, MS_Z - 3, STRUCTURE.LAMPPOST);
    setProp(x, MS_Z + 3, STRUCTURE.LAMPPOST);
  }
  for (let z = 6; z < MS_Z - 3; z += 6) {
    setProp(TS_X - 3, z, STRUCTURE.LAMPPOST);
    setProp(TS_X + 3, z, STRUCTURE.LAMPPOST);
  }

  // Flower planters and benches around the temple plaza fountain.
  setProp(32, 36, STRUCTURE.FLOWER_POT);
  setProp(37, 36, STRUCTURE.FLOWER_POT);
  setProp(32, 37, STRUCTURE.BUSH);
  setProp(37, 37, STRUCTURE.BUSH);
  setProp(30, 34, STRUCTURE.LAMPPOST);
  setProp(39, 34, STRUCTURE.LAMPPOST);

  // Barrels/crates on the harbour dock.
  setProp(15, MS_Z, STRUCTURE.BARREL);
  setProp(15, MS_Z + 1, STRUCTURE.CRATE);
  setProp(15, MS_Z + 2, STRUCTURE.BARREL);
  setProp(15, MS_Z - 1, STRUCTURE.CRATE);

  // ── Bridges out of the four gates: paved connecting road ─────────
  for (let x = EAST + 2; x < W; x++) setGround(x, MS_Z, BLOCK.ROAD);
  for (let x = EAST + 2; x < W; x++) setGround(x, MS_Z - 1, BLOCK.ROAD);
  for (let x = EAST + 2; x < W; x++) setGround(x, MS_Z + 1, BLOCK.ROAD);
  for (let z = 0; z < 4; z++) setGround(TS_X, z, BLOCK.ROAD);
  for (let z = H - 4; z < H; z++) setGround(HS_X, z, BLOCK.ROAD);
}

build();

export function cityGround(wx, wz) {
  const lx = wx - CITY_MIN_X;
  const lz = wz - CITY_MIN_Z;
  if (!inBounds(lx, lz)) return 0;
  return ground[idx(lx, lz)];
}

export function cityStructure(wx, wz) {
  const lx = wx - CITY_MIN_X;
  const lz = wz - CITY_MIN_Z;
  if (!inBounds(lx, lz)) return 0;
  return structure[idx(lx, lz)];
}

export function cityRoof(wx, wz) {
  const lx = wx - CITY_MIN_X;
  const lz = wz - CITY_MIN_Z;
  if (!inBounds(lx, lz)) return 0;
  return roof[idx(lx, lz)];
}

export function cityProp(wx, wz) {
  const lx = wx - CITY_MIN_X;
  const lz = wz - CITY_MIN_Z;
  if (!inBounds(lx, lz)) return 0;
  return prop[idx(lx, lz)];
}

export function cityChimney(wx, wz) {
  const lx = wx - CITY_MIN_X;
  const lz = wz - CITY_MIN_Z;
  if (!inBounds(lx, lz)) return 0;
  return chimney[idx(lx, lz)];
}

export function isInCity(wx, wz) {
  return wx >= CITY_MIN_X && wz >= CITY_MIN_Z && wx < CITY_MAX_X && wz < CITY_MAX_Z;
}
