const DIRS = {
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
};

export class InputController {
  constructor() {
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
    const buttons = document.querySelectorAll('.dpad-btn[data-dir]');
    buttons.forEach((btn) => {
      const dir = btn.getAttribute('data-dir');
      if (!dir) return;

      const press = (e) => {
        e.preventDefault();
        this.held.add(dir);
        btn.classList.add('is-active');
      };
      const release = (e) => {
        e.preventDefault();
        this.held.delete(dir);
        btn.classList.remove('is-active');
      };

      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
      // Fall back to touch/mouse in case pointer events misbehave.
      btn.addEventListener('touchstart', press, { passive: false });
      btn.addEventListener('touchend', release, { passive: false });
      btn.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  /** Returns {x,z} delta for the current intent, or null. */
  currentDirection() {
    // Priority: last-added direction wins.
    const arr = Array.from(this.held);
    if (arr.length === 0) return null;
    const last = arr[arr.length - 1];
    return DIRS[last] ?? null;
  }
}
