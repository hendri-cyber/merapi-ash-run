// Keyboard + mouse input for MERAPI ASH RUN. Keys are read as a held-set each
// frame; the game loop applies them with a fixed timestep, so a recorded key
// sequence replays deterministically.

export function createInput(onAction) {
  const keys = new Set();
  const codeOf = (e) => e.code;

  function down(e) {
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (!e.repeat) {
      keys.add(codeOf(e));
      if (onAction) onAction(codeOf(e));
    }
  }
  function up(e) {
    keys.delete(codeOf(e));
  }
  function blur() {
    keys.clear();
  }

  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', blur);
  window.addEventListener('mousedown', () => {
    if (onAction) onAction('MouseClick');
  });

  return {
    held(code) {
      return keys.has(code);
    },
    get bank() {
      // -1 (left) .. +1 (right)
      return (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) -
        (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
    },
    get pitch() {
      // +1 = climb (ArrowUp), -1 = descend (ArrowDown). W/S is throttle, not pitch.
      return (keys.has('ArrowUp') ? 1 : 0) - (keys.has('ArrowDown') ? 1 : 0);
    },
    get pitchKeys() {
      return { up: keys.has('ArrowUp'), down: keys.has('ArrowDown') };
    },
    get throttleUp() {
      return keys.has('KeyW');
    },
    get throttleDown() {
      return keys.has('KeyS');
    },
    destroy() {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    },
  };
}
