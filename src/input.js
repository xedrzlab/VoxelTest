// Screen-aligned directions. The isometric camera is at (+X, +Y, +Z),
// so on-screen "down" is the world +X+Z diagonal, on-screen "right" is
// +X-Z, etc. Mapping the cardinals this way makes the d-pad and arrow
// keys move the character in the direction they visually point.
const CARDINAL = {
  up: { x: -1, z: -1 },
  down: { x: 1, z: 1 },
  left: { x: -1, z: 1 },
  right: { x: 1, z: -1 },
};

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class InputController {
  constructor() {
    /** @type {Set<string>} cardinal directions currently held */
    this.held = new Set();
    this._bindKeyboard();
    this._bindDpad();
  }

  _bindKeyboard() {
    const map = {
      ArrowUp: 'up',
      KeyW: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      ArrowLeft: 'left',
      KeyA: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
    };
    window.addEventListener('keydown', (e) => {
      const dir = map[e.code];
      if (dir) {
        this.held.add(dir);
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const dir = map[e.code];
      if (dir) {
        this.held.delete(dir);
        e.preventDefault();
      }
    });
    window.addEventListener('blur', () => this.held.clear());
  }

  _bindDpad() {
    const buttons = document.querySelectorAll('.dpad-btn[data-dirs]');
    buttons.forEach((btn) => {
      const dirs = (btn.getAttribute('data-dirs') || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (dirs.length === 0) return;

      // Track active pointers per-button so we know when the last
      // finger has lifted, even if it drifted off the button first.
      const activePointers = new Set();

      const press = (e) => {
        e.preventDefault();
        // Capture the pointer so pointerup fires on this button even
        // if the finger drifts a few pixels away. Without this, a small
        // drift fires pointerleave and drops one of the two directions
        // for a diagonal button — the finger reads as "down" alone and
        // the character walks straight down.
        if (e.pointerId != null && btn.setPointerCapture) {
          try {
            btn.setPointerCapture(e.pointerId);
          } catch {}
          activePointers.add(e.pointerId);
        }
        for (const d of dirs) this.held.add(d);
        btn.classList.add('is-active');
      };

      const release = (e) => {
        e.preventDefault();
        if (e.pointerId != null) activePointers.delete(e.pointerId);
        if (activePointers.size > 0) return;
        for (const d of dirs) this.held.delete(d);
        btn.classList.remove('is-active');
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  currentDirection() {
    if (this.held.size === 0) return null;
    let x = 0;
    let z = 0;
    for (const d of this.held) {
      if (this.held.has(OPPOSITE[d])) continue;
      const v = CARDINAL[d];
      x += v.x;
      z += v.z;
    }
    if (x === 0 && z === 0) return null;
    return { x: Math.sign(x), z: Math.sign(z) };
  }
}
