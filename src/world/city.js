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
 * Build a house. Purpose drives door decorations, chimney placement,
 * and any interior props — every prop is placed because of what the
 * building IS, not by hashing coordinates.
 *
 * Purposes: 'castle', 'hq', 'church', 'temple', 'tavern', 'shop',
 * 'mill', 'guild', 'apt', 'depot', 'library'.
 */
function building(x0, z0, x1, z1, wall, roofType, floor, door, purpose) {
  fillRect(x0, z0, x1, z1, floor);
  strokeRect(x0, z0, x1, z1, wall);
  fillRoof(x0, z0, x1, z1, roofType);

  // Chimney position depends on purpose. Businesses that need heat/smoke
  // (tavern, bakery/mill, forge-shop) get one near the hearth wall;
  // castles and temples get one on a rear corner. Apartments get one
  // per unit (handled elsewhere). Guild/temple/church skip it.
  if (purpose === 'tavern' || purpose === 'mill' || purpose === 'shop'
      || purpose === 'depot' || purpose === 'hq' || purpose === 'castle') {
    const cx = x0 + 1;
    const cz = z0 + 1;
    if (cx < x1 && cz < z1) setChimney(cx, cz, STRUCTURE.CHIMNEY);
  }

  if (!door) return;

  const [side, off] = door;
  let dx = 0, dz = 0;
  if (side === 'N') { dx = x0 + off; dz = z0; }
  if (side === 'S') { dx = x0 + off; dz = z1; }
  if (side === 'W') { dx = x0; dz = z0 + off; }
  if (side === 'E') { dx = x1; dz = z0 + off; }
  setStructure(dx, dz, STRUCTURE.NONE);
  setGround(dx, dz, BLOCK.COBBLE);

  // Vectors pointing out of the door and along the wall.
  const outside = { N: [0, -1], S: [0, 1], W: [-1, 0], E: [1, 0] }[side];
  const [ox, oz] = outside;
  const [px, pz] = [-oz, ox]; // perpendicular (along the wall)

  const leftX = dx + ox + px, leftZ = dz + oz + pz;
  const rightX = dx + ox - px, rightZ = dz + oz - pz;
  const frontX = dx + ox * 2, frontZ = dz + oz * 2;

  const put = (x, z, s) => {
    if (!inBounds(x, z)) return;
    if (structure[idx(x, z)] === 0 && prop[idx(x, z)] === 0) setProp(x, z, s);
  };

  // Prop plan per purpose. Read this as "why is this here":
  // A working tavern serves drinks → barrels of ale by the door, a
  // lamp so patrons can find the entry after dark, a hanging sign so
  // travellers know what it is. A shop sells wares → a crate of stock
  // outside plus a sign. A mill grinds grain → barrels of flour and a
  // grain crate. Military HQ → crates of supplies + a lamp for the
  // watch. Castle → two lamps flanking the keep entrance, no clutter.
  // Church/temple → flowers and offerings. Apartments → one flower pot
  // by the door because the resident put it there. Guilds → a lamp,
  // an herb bush, and a sign identifying the guild.
  switch (purpose) {
    case 'tavern':
      put(leftX, leftZ, STRUCTURE.BARREL);
      put(rightX, rightZ, STRUCTURE.BARREL);
      put(frontX, frontZ, STRUCTURE.SIGN);
      // Extra barrel row along the tavern's outside wall.
      if (side === 'S') put(x0 + 1, z1 + 1, STRUCTURE.BARREL);
      if (side === 'N') put(x1 - 1, z0 - 1, STRUCTURE.BARREL);
      break;
    case 'shop':
      put(leftX, leftZ, STRUCTURE.LAMPPOST);
      put(rightX, rightZ, STRUCTURE.CRATE);
      put(frontX, frontZ, STRUCTURE.SIGN);
      break;
    case 'depot':
      // Depot stores adventurers' loot — crates, crates, and a lamp.
      put(leftX, leftZ, STRUCTURE.CRATE);
      put(rightX, rightZ, STRUCTURE.CRATE);
      put(frontX, frontZ, STRUCTURE.LAMPPOST);
      break;
    case 'library':
      put(leftX, leftZ, STRUCTURE.LAMPPOST);
      put(rightX, rightZ, STRUCTURE.FLOWER_POT);
      break;
    case 'mill':
      put(leftX, leftZ, STRUCTURE.BARREL);
      put(rightX, rightZ, STRUCTURE.BARREL);
      put(frontX, frontZ, STRUCTURE.CRATE);
      break;
    case 'hq':
      put(leftX, leftZ, STRUCTURE.LAMPPOST);
      put(rightX, rightZ, STRUCTURE.CRATE);
      break;
    case 'castle':
      // Ceremonial: two matched lamps, nothing else.
      put(leftX, leftZ, STRUCTURE.LAMPPOST);
      put(rightX, rightZ, STRUCTURE.LAMPPOST);
      break;
    case 'temple':
    case 'church':
      // Sacred entry: flowers on both sides.
      put(leftX, leftZ, STRUCTURE.FLOWER_POT);
      put(rightX, rightZ, STRUCTURE.FLOWER_POT);
      break;
    case 'guild':
      put(leftX, leftZ, STRUCTURE.LAMPPOST);
      put(rightX, rightZ, STRUCTURE.BUSH);
      put(frontX, frontZ, STRUCTURE.SIGN);
      break;
    case 'apt':
      // Residents tend a small plant by their front door.
      put(leftX, leftZ, STRUCTURE.FLOWER_POT);
      break;
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
  // (Lower Swamp Lane removed — it was cutting through the Alai
  // Flats south block; Upper Swamp Lane covers the same connection.)
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
  building(20, 6, 30, 14, STRUCTURE.WALL_CASTLE, STRUCTURE.ROOF_GRAY,
    BLOCK.FLOOR_STONE, ['S', 5], 'castle');
  // Castle courtyard cobble in front.
  fillRect(21, 15, 29, 18, BLOCK.COBBLE);
  setStructure(20, 6, STRUCTURE.WALL_CASTLE);
  setStructure(30, 6, STRUCTURE.WALL_CASTLE);
  // Ceremonial lamps at the courtyard corners and a pair of hedges
  // framing the walk to the keep — this is a formal royal approach.
  setProp(21, 17, STRUCTURE.LAMPPOST);
  setProp(29, 17, STRUCTURE.LAMPPOST);
  setProp(23, 16, STRUCTURE.BUSH);
  setProp(27, 16, STRUCTURE.BUSH);
  // Royal Army HQ next door — shifted east of Temple Street (x=32-36).
  building(38, 6, 46, 13, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_STONE, ['S', 4], 'hq');
  setProp(39, 15, STRUCTURE.CRATE);
  setProp(45, 15, STRUCTURE.CRATE);
  // Church — modest stone chapel with a garden path.
  building(15, 10, 19, 16, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE,
    BLOCK.FLOOR_STONE, ['S', 2], 'church');

  // ── Northern shops along Temple Street ───────────────────────────
  building(24, 20, 30, 26, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['E', 3], 'shop');
  building(38, 20, 44, 26, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['W', 3], 'shop');

  // ── Mill Avenue district (NE), buildings sit on either side of the
  // avenue (x=50,51). West block ends at x=49, east block starts at x=52.
  building(46, 8, 49, 14, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['S', 2], 'shop');
  building(52, 8, 62, 14, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['S', 5], 'shop');
  building(46, 18, 49, 26, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['S', 2], 'shop');
  building(52, 18, 62, 26, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['S', 5], 'shop');
  // Mill — sacks of grain queued outside for the miller.
  building(56, 6, 60, 10, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_STONE, ['S', 2], 'mill');
  setProp(57, 12, STRUCTURE.CRATE);
  setProp(59, 12, STRUCTURE.CRATE);

  // ── Central temple, north of Main/Temple Street junction ────────
  // Building south wall lands at z=30, leaving z=31 as buffer before
  // Main Street starts at z=32.
  building(29, 26, 39, 30, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE,
    BLOCK.FLOOR_STONE, ['S', 5], 'temple');
  // Fountain plaza to the SOUTH of Main Street (Main Street occupies
  // z=32..36). Fountain sits at z=37-38 with symmetric planters.
  setStructure(34, 37, STRUCTURE.FOUNTAIN);
  setStructure(35, 37, STRUCTURE.FOUNTAIN);
  setStructure(34, 38, STRUCTURE.FOUNTAIN);
  setStructure(35, 38, STRUCTURE.FOUNTAIN);
  setProp(32, 37, STRUCTURE.FLOWER_POT);
  setProp(37, 37, STRUCTURE.FLOWER_POT);
  setProp(32, 38, STRUCTURE.BUSH);
  setProp(37, 38, STRUCTURE.BUSH);
  setProp(31, 36, STRUCTURE.LAMPPOST);
  setProp(38, 36, STRUCTURE.LAMPPOST);

  // ── Depot / library / civic buildings around the temple ────────
  // All shifted north 2 tiles so south walls sit at z=30 (buffer at
  // z=31, Main Street starts at z=32).
  building(22, 26, 27, 30, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['E', 2], 'depot');
  building(41, 26, 46, 30, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['W', 2], 'library');

  // ── Frodo's Tavern & east-shop, likewise shifted ────────────────
  building(48, 26, 55, 30, STRUCTURE.WALL_WOOD, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['S', 3], 'tavern');
  building(57, 26, 62, 30, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['S', 2], 'shop');

  // ── East wall houses row (residents live tucked against the wall) ─
  for (let z = 6; z <= H - 10; z += 6) {
    // Skip any building whose z..z+4 span would collide with a
    // horizontal road (Main Street at 32-36 or Upper Swamp Lane at 58-59).
    if (z + 4 >= MS_Z - 2 && z <= MS_Z + 2) continue;
    if (z + 4 >= H - 12 && z <= H - 11) continue;
    building(60, z, 65, z + 4, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
      BLOCK.FLOOR_WOOD, ['W', 2], 'apt');
  }

  // ── Alai Flats — two dense apartment blocks with per-unit doors ─
  // Instead of one door per block, cut a door per apartment so each
  // unit reads as a home. Flower pot beside each door because that's
  // what a resident would put there.
  const flatDoors1 = [23, 27, 31, 35, 37];
  const flatDoors2 = [23, 27, 31, 35, 37];
  building(22, MS_Z + 4, 38, MS_Z + 9, STRUCTURE.WALL_STONE,
    STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, null, 'apt');
  for (const dx of flatDoors1) {
    setStructure(dx, MS_Z + 4, STRUCTURE.NONE);
    setGround(dx, MS_Z + 4, BLOCK.COBBLE);
    setProp(dx - 1, MS_Z + 3, STRUCTURE.FLOWER_POT);
  }
  for (let x = 26; x <= 36; x += 4) {
    for (let z = MS_Z + 5; z <= MS_Z + 8; z++) setStructure(x, z, STRUCTURE.WALL_STONE);
  }

  building(22, H - 10, 38, H - 5, STRUCTURE.WALL_STONE,
    STRUCTURE.ROOF_RED, BLOCK.FLOOR_WOOD, null, 'apt');
  for (const dx of flatDoors2) {
    setStructure(dx, H - 10, STRUCTURE.NONE);
    setGround(dx, H - 10, BLOCK.COBBLE);
    setProp(dx - 1, H - 11, STRUCTURE.FLOWER_POT);
  }
  for (let x = 26; x <= 36; x += 4) {
    for (let z = H - 9; z <= H - 6; z++) setStructure(x, z, STRUCTURE.WALL_STONE);
  }

  // Row of smaller houses south of Main Street. The one that used to
  // span x=40..46 now ends at x=43 so it doesn't cross Farm Lane
  // (x=44..45). The rest sit east of Farm Lane already.
  building(40, MS_Z + 4, 43, MS_Z + 9, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['N', 2], 'apt');
  building(48, MS_Z + 4, 54, MS_Z + 9, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['N', 3], 'apt');
  building(56, MS_Z + 4, 62, MS_Z + 9, STRUCTURE.WALL_TIMBER, STRUCTURE.ROOF_RED,
    BLOCK.FLOOR_WOOD, ['N', 3], 'apt');

  // Farm-lane pig enclosure — moved 6 tiles south of the row houses so
  // it doesn't overlap them, and tucked east of Farm Lane.
  strokeRect(FL_X + 3, MS_Z + 12, FL_X + 6, MS_Z + 15, STRUCTURE.FENCE);
  for (let z = MS_Z + 13; z <= MS_Z + 14; z++) {
    for (let x = FL_X + 4; x <= FL_X + 5; x++) setGround(x, z, BLOCK.DIRT);
  }
  setProp(FL_X + 3, MS_Z + 11, STRUCTURE.BARREL);
  setProp(FL_X + 7, MS_Z + 15, STRUCTURE.CRATE);

  // ── Sorcerer's district (SW), tucked west of Harbour Street ─────
  // Harbour Street runs at x=19..21, so guild buildings sit at x=14..18
  // with the door facing the road (east side).
  // North block shifted up so it sits ABOVE Sorcerer's Avenue
  // (z=46,47) instead of getting a road cut through its middle.
  building(14, MS_Z + 4, 18, MS_Z + 10, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE,
    BLOCK.FLOOR_STONE, ['E', 3], 'guild');
  building(14, MS_Z + 16, 18, MS_Z + 22, STRUCTURE.WALL_STONE, STRUCTURE.ROOF_WHITE,
    BLOCK.FLOOR_STONE, ['E', 3], 'guild');

  // ── Trees: only in specific green spaces that need shade ────────
  // Grouped intentionally: a small park north of the temple plaza,
  // hedges along the church garden path, and a treeline against the
  // east wall so the wall doesn't read as a bare fence.
  const parkTrees = [
    // Temple plaza park (SE of temple)
    [30, 39], [39, 39], [30, 40], [39, 40],
    // Church garden
    [15, 17], [17, 18],
    // East-wall treeline
    [58, 8], [58, 20], [58, 40], [58, 46], [58, 54],
    // Small green pocket at the north end of Farm Lane
    [43, MS_Z - 3], [46, MS_Z - 3],
  ];
  for (const [x, z] of parkTrees) {
    if (ground[idx(x, z)] === BLOCK.GRASS && structure[idx(x, z)] === 0) tree(x, z);
  }

  // ── Street lamps at road intersections and gate approaches ───────
  // Two at each of the four gates so guards can see who's coming in.
  setProp(TS_X - 2, 5, STRUCTURE.LAMPPOST);
  setProp(TS_X + 2, 5, STRUCTURE.LAMPPOST);
  setProp(HS_X - 2, H - 5, STRUCTURE.LAMPPOST);
  setProp(HS_X + 2, H - 5, STRUCTURE.LAMPPOST);
  setProp(EAST - 1, MS_Z - 2, STRUCTURE.LAMPPOST);
  setProp(EAST - 1, MS_Z + 2, STRUCTURE.LAMPPOST);
  setProp(HS_X + 1, MS_Z + 4, STRUCTURE.LAMPPOST); // west gate to bridge

  // One lamp at each major street intersection.
  setProp(TS_X - 3, MS_Z - 3, STRUCTURE.LAMPPOST); // Main × Temple NW
  setProp(TS_X + 3, MS_Z - 3, STRUCTURE.LAMPPOST); // Main × Temple NE
  setProp(HS_X - 2, MS_Z - 3, STRUCTURE.LAMPPOST); // Main × Harbour NW
  setProp(HS_X + 2, MS_Z - 3, STRUCTURE.LAMPPOST); // Main × Harbour NE
  setProp(FL_X - 1, MS_Z + 3, STRUCTURE.LAMPPOST); // Farm Lane / Main
  setProp(MA_X - 1, MS_Z - 3, STRUCTURE.LAMPPOST); // Mill Avenue / Main

  // ── Harbour dock — cargo actually staged for loading/unloading ──
  // Barrels of ale in one cluster, crates of goods in another, a
  // single lamp at the base of the pier for evening arrivals.
  setProp(15, MS_Z - 2, STRUCTURE.LAMPPOST);
  setProp(15, MS_Z, STRUCTURE.BARREL);
  setProp(15, MS_Z + 1, STRUCTURE.BARREL);
  setProp(15, MS_Z + 2, STRUCTURE.CRATE);
  setProp(15, MS_Z + 3, STRUCTURE.CRATE);
  setProp(15, MS_Z + 4, STRUCTURE.CRATE);
  // Coil of cargo on the sand beside the dock.
  setProp(16, MS_Z - 1, STRUCTURE.BARREL);
  setProp(16, MS_Z + 3, STRUCTURE.CRATE);
  // Small sign at the dockhead pointing to the captain.
  setProp(16, MS_Z, STRUCTURE.SIGN);

  // ── Bridges out of the four gates: paved connecting road ─────────
  for (let x = EAST + 2; x < W; x++) setGround(x, MS_Z, BLOCK.ROAD);
  for (let x = EAST + 2; x < W; x++) setGround(x, MS_Z - 1, BLOCK.ROAD);
  for (let x = EAST + 2; x < W; x++) setGround(x, MS_Z + 1, BLOCK.ROAD);
  for (let z = 0; z < 4; z++) setGround(TS_X, z, BLOCK.ROAD);
  for (let z = H - 4; z < H; z++) setGround(HS_X, z, BLOCK.ROAD);

  // ── Road-clearing pass ─────────────────────────────────────────────
  // Anything that landed on top of a cobble/road street tile gets
  // removed so the streets stay walkable end-to-end. Fences and
  // building walls that straddle a road produce a doorway there
  // instead of a blocker.
  const CLEAR_WALLS = new Set([
    STRUCTURE.WALL_STONE, STRUCTURE.WALL_CASTLE,
    STRUCTURE.WALL_WOOD, STRUCTURE.WALL_TIMBER,
    STRUCTURE.FENCE,
  ]);
  for (let z = 0; z < H; z++) {
    for (let x = 0; x < W; x++) {
      const g = ground[idx(x, z)];
      if (g !== BLOCK.COBBLE && g !== BLOCK.ROAD) continue;
      const s = structure[idx(x, z)];
      if (CLEAR_WALLS.has(s)) structure[idx(x, z)] = 0;
      // Roofs must not float over a road (would leave a floating slab
      // once the wall beneath is cleared).
      roof[idx(x, z)] = 0;
      // Props that would block a road (lampposts are OK to leave —
      // they sit tight to one side and the player can walk around).
      const p = prop[idx(x, z)];
      if (p === STRUCTURE.CRATE || p === STRUCTURE.BARREL || p === STRUCTURE.BUSH
          || p === STRUCTURE.FLOWER_POT || p === STRUCTURE.SIGN) {
        prop[idx(x, z)] = 0;
      }
      chimney[idx(x, z)] = 0;
    }
  }
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
