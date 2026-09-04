import { BLOCK, STRUCTURE } from './config.js';
import { blockAt, roofAt, structureAt } from './world/terrain.js';

// Map a block/structure to a solid CSS color for the minimap.
function tileColor(wx, wz) {
  const st = structureAt(wx, wz);
  if (st !== 0 && st !== STRUCTURE.NONE) {
    if (st === STRUCTURE.WALL_CASTLE) return '#4a4c52';
    if (st === STRUCTURE.WALL_STONE) return '#6c6f74';
    if (st === STRUCTURE.WALL_WOOD) return '#6a4a2c';
    if (st === STRUCTURE.SHIP_HULL) return '#3a2818';
    if (st === STRUCTURE.DOCK_WOOD) return '#7a5028';
    if (st === STRUCTURE.TREE_TRUNK) return '#2c5820';
    if (st === STRUCTURE.FOUNTAIN) return '#a8b8c8';
    if (st === STRUCTURE.FENCE) return '#5a3a20';
  }
  const roof = roofAt(wx, wz);
  if (roof !== 0) {
    if (roof === STRUCTURE.ROOF_RED) return '#a83c24';
    if (roof === STRUCTURE.ROOF_GRAY) return '#54525a';
    if (roof === STRUCTURE.ROOF_WHITE) return '#e4dcc8';
    if (roof === STRUCTURE.TREE_LEAVES) return '#2c6a2c';
  }
  const b = blockAt(wx, wz);
  switch (b) {
    case BLOCK.WATER: return '#2c64a8';
    case BLOCK.SAND: return '#e2cc8a';
    case BLOCK.GRASS: return '#6aa84a';
    case BLOCK.DIRT: return '#8a5a37';
    case BLOCK.STONE: return '#8a8c8e';
    case BLOCK.ROAD: return '#d6a86a';
    case BLOCK.COBBLE: return '#a89c8a';
    case BLOCK.FLOOR_STONE: return '#c4baa8';
    case BLOCK.FLOOR_WOOD: return '#8a5e30';
    default: return '#111';
  }
}

export class MiniMap {
  constructor(canvas, player) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.player = player;
    this.radius = 30; // tiles from center on each side
    this.lastTile = { x: NaN, z: NaN };
  }

  render(force = false) {
    const tx = this.player.tileX;
    const tz = this.player.tileZ;
    if (!force && tx === this.lastTile.x && tz === this.lastTile.z) return;
    this.lastTile = { x: tx, z: tz };

    const w = this.canvas.width;
    const h = this.canvas.height;
    const side = this.radius * 2 + 1;
    const px = w / side;

    this.ctx.fillStyle = '#0b0d10';
    this.ctx.fillRect(0, 0, w, h);

    for (let dz = -this.radius; dz <= this.radius; dz++) {
      for (let dx = -this.radius; dx <= this.radius; dx++) {
        const wx = tx + dx;
        const wz = tz + dz;
        this.ctx.fillStyle = tileColor(wx, wz);
        this.ctx.fillRect(
          Math.floor((dx + this.radius) * px),
          Math.floor((dz + this.radius) * px),
          Math.ceil(px),
          Math.ceil(px),
        );
      }
    }

    // Player marker: red dot in the center.
    const cx = w / 2, cy = h / 2;
    this.ctx.fillStyle = '#f24040';
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, Math.max(3, px * 0.55), 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.strokeStyle = '#fff';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
  }
}
