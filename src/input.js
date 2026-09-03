const CARDINAL = {
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export class InputController {
  constructor() {
    /** @type {Set<string>} cardinal directions currently held */
    this.held = new Set();
    /** track dpad button element -> which cardinals it added */
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

      const press = (e) => {
        e.preventDefault();
        for (const d of dirs) this.held.add(d);
        btn.classList.add('is-active');
      };
      const release = (e) => {
        e.preventDefault();
        for (const d of dirs) this.held.delete(d);
        btn.classList.remove('is-active');
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  /**
   * Combine all held cardinals into a single {x,z} step vector.
   * Opposing directions cancel; result is one of the 8 unit deltas or null.
   */
  currentDirection() {
    if (this.held.size === 0) return null;
    let x = 0;
    let z = 0;
    for (const d of this.held) {
      // Skip a direction whose opposite is also held; they cancel.
      if (this.held.has(OPPOSITE[d])) continue;
      const v = CARDINAL[d];
      x += v.x;
      z += v.z;
    }
    if (x === 0 && z === 0) return null;
    return { x: Math.sign(x), z: Math.sign(z) };
  }
}
