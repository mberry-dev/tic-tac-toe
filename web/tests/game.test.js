import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  LINES, MODES, chooseAiMove, createGame, emptyBoard, emptyCells, findWinningMove,
  getWinner, humanMove, isAiTurn, isFull, modeText, playMove, resetBoard, setMode, statusText,
} from '../src/game.js';

// Builds a board from 9 characters: X, O or . (empty)
const board = (text) => [...text.replace(/\s/g, '')].map((c) => (c === '.' ? '' : c));

// Plays a list of cell numbers in order, starting from X
function play(state, ...moves) {
  return moves.reduce((s, index) => playMove(s, index), state);
}

describe('getWinner', () => {
  test('finds every one of the 8 winning lines for both players', () => {
    assert.equal(LINES.length, 8);
    for (const line of LINES) {
      for (const player of ['X', 'O']) {
        const b = emptyBoard();
        line.forEach((i) => { b[i] = player; });
        assert.deepEqual(getWinner(b), { player, line });
      }
    }
  });

  test('returns null for an empty board, a partly filled board, and a tie', () => {
    assert.equal(getWinner(emptyBoard()), null);
    assert.equal(getWinner(board('XO. .X. ...')), null);
    assert.equal(getWinner(board('XOX XOO OXX')), null);
  });

  test('two in a row is not a win', () => {
    assert.equal(getWinner(board('XX. ... ...')), null);
  });
});

describe('emptyCells and isFull', () => {
  test('lists empty cells in order', () => {
    assert.deepEqual(emptyCells(board('X.O .X. ..O')), [1, 3, 5, 6, 7]);
  });
  test('isFull is true only when no cell is empty', () => {
    assert.equal(isFull(emptyBoard()), false);
    assert.equal(isFull(board('XOX XOO OXX')), true);
    assert.equal(isFull(board('XOX XOO OX.')), false);
  });
});

describe('findWinningMove', () => {
  test('finds the cell that completes a row, column and diagonal', () => {
    assert.equal(findWinningMove(board('OO. ... ...'), 'O'), 2);
    assert.equal(findWinningMove(board('X.. X.. ...'), 'X'), 6);
    assert.equal(findWinningMove(board('X.. .X. ...'), 'X'), 8);
    assert.equal(findWinningMove(board('..X .X. ...'), 'X'), 6);
  });
  test('returns null when there is no winning move', () => {
    assert.equal(findWinningMove(emptyBoard(), 'X'), null);
    assert.equal(findWinningMove(board('XO. ... ...'), 'X'), null);
  });
  test('does not count a line the opponent has blocked', () => {
    assert.equal(findWinningMove(board('XXO ... ...'), 'X'), null);
  });
  test('does not change the board it is given', () => {
    const b = board('OO. ... ...');
    findWinningMove(b, 'O');
    assert.deepEqual(b, board('OO. ... ...'));
  });
});

describe('chooseAiMove', () => {
  test('wins when it can, even if it could also block', () => {
    // O can win at 5; X threatens 2. Winning comes first.
    assert.equal(chooseAiMove(board('XX. OO. ...')), 5);
  });
  test('blocks the opponent when it cannot win', () => {
    assert.equal(chooseAiMove(board('XX. ... O..')), 2);
    assert.equal(chooseAiMove(board('X.. X.. .O.')), 6);
  });
  test('takes the center when nothing is urgent', () => {
    assert.equal(chooseAiMove(board('X.. ... ...')), 4);
  });
  test('otherwise picks a random empty cell, using the supplied random function', () => {
    // Center is taken, and neither side can complete a line: only cells 7 and 8 are open.
    const quiet = board('XXO OOX X..');
    assert.equal(getWinner(quiet), null);
    assert.equal(findWinningMove(quiet, 'O'), null);
    assert.equal(findWinningMove(quiet, 'X'), null);
    assert.deepEqual(emptyCells(quiet), [7, 8]);
    assert.equal(chooseAiMove(quiet, () => 0), 7);
    assert.equal(chooseAiMove(quiet, () => 0.99), 8);
  });
  test('survives a random function that returns an out-of-range value', () => {
    const quiet = board('XXO OOX X..');
    assert.equal(chooseAiMove(quiet, () => 1), 8);
    assert.equal(chooseAiMove(quiet, () => -1), 7);
  });
  test('returns null when the board is full', () => {
    assert.equal(chooseAiMove(board('XOX XOO OXX')), null);
  });
  test('only ever returns an empty cell (10,000 random positions)', () => {
    let seed = 12345;
    const rng = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    for (let n = 0; n < 10000; n++) {
      const b = emptyBoard();
      const filled = Math.floor(rng() * 8);
      for (let k = 0; k < filled; k++) b[Math.floor(rng() * 9)] = rng() < 0.5 ? 'X' : 'O';
      if (getWinner(b) || isFull(b)) continue;
      const move = chooseAiMove(b, rng);
      assert.equal(b[move], '', `AI picked occupied cell ${move} on ${b.join('|')}`);
    }
  });
});

describe('createGame', () => {
  test('starts empty with X to move and zero scores', () => {
    const g = createGame();
    assert.deepEqual(g.board, emptyBoard());
    assert.equal(g.current, 'X');
    assert.equal(g.status, 'playing');
    assert.deepEqual(g.scores, { X: 0, O: 0 });
    assert.equal(g.mode, MODES.PVP);
  });
  test('rejects an unknown mode', () => {
    assert.throws(() => createGame('hard'), RangeError);
  });
});

describe('playMove', () => {
  test('places the current mark and passes the turn', () => {
    const g = playMove(createGame(), 4);
    assert.equal(g.board[4], 'X');
    assert.equal(g.current, 'O');
    assert.equal(playMove(g, 0).board[0], 'O');
  });
  test('rejects an occupied cell without changing anything', () => {
    const g = playMove(createGame(), 4);
    assert.equal(playMove(g, 4), g);
  });
  test('rejects indexes outside the board and non-integers', () => {
    const g = createGame();
    for (const bad of [-1, 9, 1.5, NaN, undefined, null, '3']) assert.equal(playMove(g, bad), g);
  });
  test('does not mutate the previous state', () => {
    const g = createGame();
    const before = JSON.stringify(g);
    playMove(g, 0);
    assert.equal(JSON.stringify(g), before);
  });
  test('X wins across the top row and scores a point', () => {
    const g = play(createGame(), 0, 3, 1, 4, 2);
    assert.equal(g.status, 'won');
    assert.equal(g.winner, 'X');
    assert.deepEqual(g.line, [0, 1, 2]);
    assert.deepEqual(g.scores, { X: 1, O: 0 });
  });
  test('O can win too', () => {
    const g = play(createGame(), 0, 3, 1, 4, 8, 5);
    assert.equal(g.winner, 'O');
    assert.deepEqual(g.scores, { X: 0, O: 1 });
  });
  test('a tie is detected and changes no score', () => {
    const g = play(createGame(), 0, 1, 2, 4, 3, 5, 7, 6, 8);
    assert.equal(g.status, 'tie');
    assert.equal(g.winner, null);
    assert.deepEqual(g.scores, { X: 0, O: 0 });
  });
  test('a win on the last cell counts as a win, not a tie', () => {
    // X ends with 0, 2, 5, 7, 8 and completes the right column with the 9th move
    const g = play(createGame(), 0, 1, 2, 4, 5, 3, 7, 6, 8);
    assert.equal(isFull(g.board), true);
    assert.equal(g.status, 'won');
    assert.equal(g.winner, 'X');
    assert.deepEqual(g.line, [2, 5, 8]);
  });
  test('no moves are allowed after the game ends', () => {
    const won = play(createGame(), 0, 3, 1, 4, 2);
    assert.equal(playMove(won, 8), won);
    const tied = play(createGame(), 0, 1, 2, 4, 3, 5, 7, 6, 8);
    assert.equal(playMove(tied, 0), tied);
  });
});

describe('resetBoard', () => {
  test('clears the board and result but keeps scores and mode', () => {
    const won = play(setMode(createGame(), MODES.AI), 0, 3, 1, 4, 2);
    const r = resetBoard(won);
    assert.deepEqual(r.board, emptyBoard());
    assert.equal(r.status, 'playing');
    assert.equal(r.current, 'X');
    assert.equal(r.winner, null);
    assert.equal(r.line, null);
    assert.deepEqual(r.scores, { X: 1, O: 0 });
    assert.equal(r.mode, MODES.AI);
  });
  test('works mid-game, handing X the first move again', () => {
    const r = resetBoard(play(createGame(), 0, 1));
    assert.equal(r.current, 'X');
    assert.deepEqual(r.board, emptyBoard());
  });
});

describe('setMode', () => {
  test('switching mode clears the board and both scores', () => {
    const won = play(createGame(), 0, 3, 1, 4, 2);
    const s = setMode(won, MODES.AI);
    assert.equal(s.mode, MODES.AI);
    assert.deepEqual(s.board, emptyBoard());
    assert.deepEqual(s.scores, { X: 0, O: 0 });
    assert.equal(s.status, 'playing');
  });
  test('rejects an unknown mode', () => {
    assert.throws(() => setMode(createGame(), 'nope'), RangeError);
  });
});

describe('AI turn handling', () => {
  test('isAiTurn only when AI mode, game running, and O to move', () => {
    const pvp = playMove(createGame(), 0);
    assert.equal(isAiTurn(pvp), false);
    const ai = playMove(createGame(MODES.AI), 0);
    assert.equal(isAiTurn(ai), true);
    assert.equal(isAiTurn(createGame(MODES.AI)), false); // X moves first
    const over = play(createGame(MODES.AI), 0, 3, 1, 4, 2); // O never gets a turn here
    assert.equal(isAiTurn(over), false);
  });
  test('humanMove is ignored while the computer is on turn', () => {
    const ai = playMove(createGame(MODES.AI), 0);
    assert.equal(humanMove(ai, 5), ai);
  });
  test('humanMove plays normally otherwise', () => {
    assert.equal(humanMove(createGame(MODES.AI), 0).board[0], 'X');
    assert.equal(humanMove(playMove(createGame(), 0), 5).board[5], 'O');
  });
  test('the computer never loses to a human who plays random moves', () => {
    let seed = 7;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    let computerWins = 0, ties = 0, humanWins = 0;
    for (let n = 0; n < 500; n++) {
      let g = createGame(MODES.AI);
      while (g.status === 'playing') {
        const cells = emptyCells(g.board);
        g = isAiTurn(g) ? playMove(g, chooseAiMove(g.board, rng)) : playMove(g, cells[Math.floor(rng() * cells.length)]);
      }
      if (g.winner === 'O') computerWins++; else if (g.winner === 'X') humanWins++; else ties++;
    }
    assert.equal(computerWins + ties + humanWins, 500);
    assert.ok(computerWins > humanWins, `computer ${computerWins} should beat random play ${humanWins}`);
  });
});

describe('text helpers', () => {
  test('statusText matches the Android strings', () => {
    assert.equal(statusText(createGame()), 'Player X Turn');
    assert.equal(statusText(playMove(createGame(), 0)), 'Player O Turn');
    assert.equal(statusText(play(createGame(), 0, 3, 1, 4, 2)), 'Player X Wins!');
    assert.equal(statusText(play(createGame(), 0, 1, 2, 4, 3, 5, 7, 6, 8)), 'Tie Game');
  });
  test('modeText matches the Android strings', () => {
    assert.equal(modeText(createGame()), 'Mode: Player vs Player');
    assert.equal(modeText(createGame(MODES.AI)), 'Mode: Player vs AI');
  });
});
