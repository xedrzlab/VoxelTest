export const CHUNK_SIZE = 16;

export const WORLD_SIZE_TILES = 128;
export const WORLD_SIZE_CHUNKS = WORLD_SIZE_TILES / CHUNK_SIZE;

export const TILE_SIZE = 1;
export const TILE_HEIGHT = 1;

export const VIEW_RADIUS_CHUNKS = 3;

// Tibia-style ground friction per tile. Higher = slower to enter.
// Combined with PLAYER_SPEED as: stepDuration = 1000 * ground / speed.
export const GROUND_SPEED = {
  ROAD: 100,
  GRASS: 150,
  DIRT: 180,
  STONE: 220,
};

// Level-1-ish walking speed. Raise for a faster character.
export const PLAYER_SPEED = 220;

// Diagonal steps take twice as long as cardinal steps, matching Tibia.
export const DIAGONAL_STEP_MULT = 2;

export const BLOCK = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  ROAD: 4,
  WATER: 5,
  SAND: 6,
  COBBLE: 7,
  FLOOR_STONE: 8,
  FLOOR_WOOD: 9,
};

export const STRUCTURE = {
  NONE: 0,
  WALL_STONE: 100,
  WALL_CASTLE: 101,
  WALL_WOOD: 102,
  ROOF_RED: 103,
  ROOF_GRAY: 104,
  ROOF_WHITE: 105,
  TREE_TRUNK: 106,
  TREE_LEAVES: 107,
  DOCK_WOOD: 108,
  SHIP_HULL: 109,
  SHIP_DECK: 110,
  MAST: 111,
  SAIL: 112,
  FOUNTAIN: 113,
  FENCE: 114,
};

export const BLOCK_COLORS = {
  [BLOCK.GRASS]: [0x6a, 0xa8, 0x4a],
  [BLOCK.DIRT]: [0x8a, 0x5a, 0x37],
  [BLOCK.STONE]: [0x88, 0x8a, 0x8c],
  [BLOCK.ROAD]: [0xd6, 0xa8, 0x6a],
  [BLOCK.WATER]: [0x2c, 0x64, 0xa8],
  [BLOCK.SAND]: [0xe2, 0xcc, 0x8a],
  [BLOCK.COBBLE]: [0x9c, 0x98, 0x8e],
  [BLOCK.FLOOR_STONE]: [0xc4, 0xba, 0xa8],
  [BLOCK.FLOOR_WOOD]: [0x8a, 0x5e, 0x30],
  [STRUCTURE.WALL_STONE]: [0xa0, 0xa2, 0xa4],
  [STRUCTURE.WALL_CASTLE]: [0x7a, 0x7c, 0x82],
  [STRUCTURE.WALL_WOOD]: [0x7a, 0x54, 0x30],
  [STRUCTURE.ROOF_RED]: [0xa8, 0x3c, 0x24],
  [STRUCTURE.ROOF_GRAY]: [0x54, 0x52, 0x54],
  [STRUCTURE.ROOF_WHITE]: [0xea, 0xe4, 0xd2],
  [STRUCTURE.TREE_TRUNK]: [0x5a, 0x3a, 0x22],
  [STRUCTURE.TREE_LEAVES]: [0x2c, 0x66, 0x2c],
  [STRUCTURE.DOCK_WOOD]: [0x6a, 0x48, 0x2a],
  [STRUCTURE.SHIP_HULL]: [0x5a, 0x3a, 0x1e],
  [STRUCTURE.SHIP_DECK]: [0x8c, 0x62, 0x38],
  [STRUCTURE.MAST]: [0x4a, 0x30, 0x1a],
  [STRUCTURE.SAIL]: [0xf0, 0xea, 0xd6],
  [STRUCTURE.FOUNTAIN]: [0xb8, 0xb2, 0xa8],
  [STRUCTURE.FENCE]: [0x6a, 0x48, 0x28],
};

export const BLOCK_GROUND_SPEED = {
  [BLOCK.GRASS]: GROUND_SPEED.GRASS,
  [BLOCK.DIRT]: GROUND_SPEED.DIRT,
  [BLOCK.STONE]: GROUND_SPEED.STONE,
  [BLOCK.ROAD]: GROUND_SPEED.ROAD,
  [BLOCK.COBBLE]: GROUND_SPEED.ROAD,
  [BLOCK.FLOOR_STONE]: GROUND_SPEED.ROAD,
  [BLOCK.FLOOR_WOOD]: GROUND_SPEED.ROAD,
  [BLOCK.SAND]: GROUND_SPEED.DIRT,
};

// Vertical size of each structure block (in tile-height units).
export const STRUCTURE_HEIGHTS = {
  [STRUCTURE.WALL_STONE]: 2.3,
  [STRUCTURE.WALL_CASTLE]: 3.4,
  [STRUCTURE.WALL_WOOD]: 2.1,
  [STRUCTURE.ROOF_RED]: 0.6,
  [STRUCTURE.ROOF_GRAY]: 0.6,
  [STRUCTURE.ROOF_WHITE]: 0.7,
  [STRUCTURE.TREE_TRUNK]: 1.6,
  [STRUCTURE.TREE_LEAVES]: 1.4,
  [STRUCTURE.DOCK_WOOD]: 0.15,
  [STRUCTURE.SHIP_HULL]: 1.0,
  [STRUCTURE.SHIP_DECK]: 0.2,
  [STRUCTURE.MAST]: 3.6,
  [STRUCTURE.SAIL]: 1.2,
  [STRUCTURE.FOUNTAIN]: 0.6,
  [STRUCTURE.FENCE]: 0.7,
};

// Structures the player can walk through (visual only).
export const STRUCTURE_PASSABLE = new Set([
  STRUCTURE.ROOF_RED,
  STRUCTURE.ROOF_GRAY,
  STRUCTURE.ROOF_WHITE,
  STRUCTURE.TREE_LEAVES,
]);

// The wall height a given roof type is supposed to sit on top of.
// Used to place interior roof cells at the correct Y even when the
// interior tile itself has no wall neighbor.
export const ROOF_BASE_HEIGHT = {
  [STRUCTURE.ROOF_RED]: 2.3,
  [STRUCTURE.ROOF_GRAY]: 3.4,
  [STRUCTURE.ROOF_WHITE]: 2.5,
};

export const BLOCK_SIDE_TINT = 0.78;

// Extents of the authored Thais-style city inside the 128x128 world.
// Everything outside stays procedural countryside.
export const CITY_MIN_X = 30;
export const CITY_MIN_Z = 30;
export const CITY_MAX_X = 100;
export const CITY_MAX_Z = 100;
