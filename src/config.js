export const CHUNK_SIZE = 16;

export const WORLD_SIZE_TILES = 128;
export const WORLD_SIZE_CHUNKS = WORLD_SIZE_TILES / CHUNK_SIZE;

export const TILE_SIZE = 1;
export const TILE_HEIGHT = 1;

export const VIEW_RADIUS_CHUNKS = 3;

export const STEP_DURATION_MS = 160;

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

export const BLOCK_SIDE_TINT = 0.78;
