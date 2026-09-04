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
};

export const BLOCK_COLORS = {
  [BLOCK.GRASS]: [0x6a, 0xa8, 0x4a],
  [BLOCK.DIRT]: [0x8a, 0x5a, 0x37],
  [BLOCK.STONE]: [0x88, 0x8a, 0x8c],
  [BLOCK.ROAD]: [0xd6, 0xa8, 0x6a],
};

export const BLOCK_GROUND_SPEED = {
  [BLOCK.GRASS]: GROUND_SPEED.GRASS,
  [BLOCK.DIRT]: GROUND_SPEED.DIRT,
  [BLOCK.STONE]: GROUND_SPEED.STONE,
  [BLOCK.ROAD]: GROUND_SPEED.ROAD,
};

export const BLOCK_SIDE_TINT = 0.78;
