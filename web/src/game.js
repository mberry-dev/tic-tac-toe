// Pure game logic for Tic-Tac-Toe. No DOM and no timers, so everything here is easy to test.
// The rules and the AI follow the Android app (BottomFragment.kt) exactly.

export const MODES = Object.freeze({ PVP: 'pvp', AI: 'ai' });

// Cells are numbered 0-8, left to right, top to bottom.
export const LINES = Object.freeze([
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
]);

const HUMAN = 'X';
const AI = 'O';

export function emptyBoard() {
  return Array(9).fill('');
}

export function emptyCells(board) {
  const cells = [];
  board.forEach((value, index) => {
    if (value === '') cells.push(index);
  });
  return cells;
}

export function isFull(board) {
  return emptyCells(board).length === 0;
}

/** Returns { player, line } for the first completed line, or null if nobody has won. */
export function getWinner(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] !== '' && board[a] === board[b] && board[a] === board[c]) {
      return { player: board[a], line: [...line] };
    }
  }
  return null;
}

function hasWon(board, player) {
  return LINES.some((line) => line.every((index) => board[index] === player));
}

/** An empty cell where `player` would complete a line, or null. Scans in cell order. */
export function findWinningMove(board, player) {
  for (const index of emptyCells(board)) {
    const trial = [...board];
    trial[index] = player;
    if (hasWon(trial, player)) return index;
  }
  return null;
}

/**
 * The computer's move: win if it can, otherwise block the opponent, otherwise take the
 * center, otherwise pick a random empty cell. Returns null when the board is full.
 * `rng` must behave like Math.random (a number from 0 up to, but not including, 1).
 */
export function chooseAiMove(board, rng = Math.random, ai = AI, opponent = HUMAN) {
  const empties = emptyCells(board);
  if (empties.length === 0) return null;

  const winning = findWinningMove(board, ai);
  if (winning !== null) return winning;

  const blocking = findWinningMove(board, opponent);
  if (blocking !== null) return blocking;

  if (board[4] === '') return 4;

  const pick = Math.floor(rng() * empties.length);
  return empties[Math.min(Math.max(pick, 0), empties.length - 1)];
}

/** A fresh game. X always moves first. */
export function createGame(mode = MODES.PVP) {
  if (mode !== MODES.PVP && mode !== MODES.AI) {
    throw new RangeError(`Unknown mode: ${mode}`);
  }
  return {
    mode,
    board: emptyBoard(),
    current: 'X',
    status: 'playing', // 'playing' | 'won' | 'tie'
    winner: null,
    line: null,
    scores: { X: 0, O: 0 },
  };
}

/** True when the computer should move next. */
export function isAiTurn(state) {
  return state.mode === MODES.AI && state.status === 'playing' && state.current === AI;
}

/**
 * Places the current player's mark. Returns the same state object, untouched, for any
 * move that isn't allowed (game over, occupied cell, or an index outside 0-8).
 */
export function playMove(state, index) {
  if (state.status !== 'playing') return state;
  if (!Number.isInteger(index) || index < 0 || index > 8) return state;
  if (state.board[index] !== '') return state;

  const board = [...state.board];
  board[index] = state.current;

  const win = getWinner(board);
  if (win) {
    return {
      ...state,
      board,
      status: 'won',
      winner: win.player,
      line: win.line,
      scores: { ...state.scores, [win.player]: state.scores[win.player] + 1 },
    };
  }
  if (isFull(board)) {
    return { ...state, board, status: 'tie' };
  }
  return { ...state, board, current: state.current === 'X' ? 'O' : 'X' };
}

/** A move made by a person. Ignored while the computer is on turn, so nobody can play O in AI mode. */
export function humanMove(state, index) {
  return isAiTurn(state) ? state : playMove(state, index);
}

/** Clears the board and gives X the first move. Scores are kept. */
export function resetBoard(state) {
  return { ...state, board: emptyBoard(), current: 'X', status: 'playing', winner: null, line: null };
}

/** Switches mode. Like the Android app, this also clears the board and both scores. */
export function setMode(state, mode) {
  return createGame(mode);
}

export function statusText(state) {
  if (state.status === 'won') return `Player ${state.winner} Wins!`;
  if (state.status === 'tie') return 'Tie Game';
  return `Player ${state.current} Turn`;
}

export function modeText(state) {
  return state.mode === MODES.AI ? 'Mode: Player vs AI' : 'Mode: Player vs Player';
}
