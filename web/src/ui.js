// The Tic-Tac-Toe interface. Builds the page inside `root` and keeps it in sync with the game state.
// Timers are passed in so tests can control the computer's "thinking" delay.

import {
  MODES, chooseAiMove, createGame, humanMove, isAiTurn, modeText, playMove, resetBoard, setMode,
  statusText,
} from './game.js';

const AI_DELAY_MS = 500; // same pause as the Android app

function cellLabel(index, value) {
  const row = Math.floor(index / 3) + 1;
  const column = (index % 3) + 1;
  return `Row ${row}, column ${column}, ${value === '' ? 'empty' : value}`;
}

/**
 * Mounts the game into `root`.
 * @param {HTMLElement} root
 * @param {object} [options]
 * @param {number} [options.aiDelay] milliseconds before the computer moves
 * @param {() => number} [options.rng] random number source (like Math.random)
 * @param {(fn: () => void, ms: number) => any} [options.schedule] like setTimeout
 * @param {(id: any) => void} [options.cancel] like clearTimeout
 * @returns {{ getState: () => object, destroy: () => void }}
 */
export function mountGame(root, options = {}) {
  const {
    aiDelay = AI_DELAY_MS,
    rng = Math.random,
    schedule = (fn, ms) => setTimeout(fn, ms),
    cancel = (id) => clearTimeout(id),
  } = options;

  const doc = root.ownerDocument;
  let state = createGame(MODES.PVP);
  let timer = null;

  function el(tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ── Build the page ────────────────────────────────────────────────────────

  const game = el('div', 'game');

  const scoreboard = el('div', 'scoreboard');
  scoreboard.setAttribute('aria-label', 'Scores');
  scoreboard.setAttribute('role', 'group');
  const xScore = el('span', 'score score-x');
  const oScore = el('span', 'score score-o');
  scoreboard.append(xScore, oScore);

  const modeButton = el('button', 'button mode-button');
  modeButton.type = 'button';

  const status = el('p', 'status');
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const grid = el('div', 'board');
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', 'Tic-Tac-Toe board');
  const cells = [];
  for (let index = 0; index < 9; index++) {
    const cell = el('button', 'cell');
    cell.type = 'button';
    cell.dataset.index = String(index);
    cells.push(cell);
    grid.append(cell);
  }

  const resetButton = el('button', 'button reset-button', 'Reset Game');
  resetButton.type = 'button';

  game.append(scoreboard, modeButton, status, grid, resetButton);
  root.replaceChildren(game);

  // ── Keep the page in sync with the state ──────────────────────────────────

  function render() {
    xScore.textContent = `X: ${state.scores.X}`;
    oScore.textContent = `O: ${state.scores.O}`;
    modeButton.textContent = modeText(state);
    status.textContent = statusText(state);

    const locked = state.status !== 'playing' || isAiTurn(state);
    cells.forEach((cell, index) => {
      const value = state.board[index];
      cell.textContent = value;
      cell.setAttribute('aria-label', cellLabel(index, value));
      // aria-disabled (not disabled) keeps keyboard focus where it is when a cell is used
      cell.setAttribute('aria-disabled', String(locked || value !== ''));
      cell.classList.toggle('is-x', value === 'X');
      cell.classList.toggle('is-o', value === 'O');
      cell.classList.toggle('is-winning', state.line !== null && state.line.includes(index));
    });
  }

  function clearTimer() {
    if (timer !== null) {
      cancel(timer);
      timer = null;
    }
  }

  // If it is the computer's turn, make its move after a short pause
  function scheduleAiMove() {
    if (timer !== null || !isAiTurn(state)) return;
    timer = schedule(() => {
      timer = null;
      if (!isAiTurn(state)) return;
      const move = chooseAiMove(state.board, rng);
      if (move !== null) state = playMove(state, move);
      render();
    }, aiDelay);
  }

  function update(next) {
    state = next;
    render();
    scheduleAiMove();
  }

  // ── Events ────────────────────────────────────────────────────────────────

  const onGridClick = (event) => {
    const cell = event.target.closest('.cell');
    if (!cell || !grid.contains(cell)) return;
    update(humanMove(state, Number(cell.dataset.index)));
  };
  const onMode = () => {
    clearTimer();
    update(setMode(state, state.mode === MODES.AI ? MODES.PVP : MODES.AI));
  };
  const onReset = () => {
    clearTimer();
    update(resetBoard(state));
  };

  grid.addEventListener('click', onGridClick);
  modeButton.addEventListener('click', onMode);
  resetButton.addEventListener('click', onReset);

  render();

  return {
    getState: () => state,
    destroy() {
      clearTimer();
      grid.removeEventListener('click', onGridClick);
      modeButton.removeEventListener('click', onMode);
      resetButton.removeEventListener('click', onReset);
      root.replaceChildren();
    },
  };
}
