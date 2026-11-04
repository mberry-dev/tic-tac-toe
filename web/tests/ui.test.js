import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { mountGame } from '../src/ui.js';

// A fake timer so the computer's delay is controlled by the test, not by the clock
function fakeScheduler() {
  const tasks = new Map();
  let nextId = 1;
  return {
    schedule(fn, ms) { const id = nextId++; tasks.set(id, { fn, ms }); return id; },
    cancel(id) { tasks.delete(id); },
    get pending() { return tasks.size; },
    get delays() { return [...tasks.values()].map((t) => t.ms); },
    runAll() { const all = [...tasks.entries()]; tasks.clear(); all.forEach(([, t]) => t.fn()); },
  };
}

let dom, root, timers, app;

function start(options = {}) {
  app = mountGame(root, { schedule: timers.schedule, cancel: timers.cancel, rng: () => 0, ...options });
}
const cells = () => [...root.querySelectorAll('.cell')];
const cell = (i) => cells()[i];
const click = (i) => cell(i).click();
const text = (selector) => root.querySelector(selector).textContent;
const marks = () => cells().map((c) => c.textContent);

beforeEach(() => {
  dom = new JSDOM('<!doctype html><div id="app"></div>');
  root = dom.window.document.getElementById('app');
  timers = fakeScheduler();
});
afterEach(() => {
  app?.destroy();
  dom.window.close();
});

describe('first render', () => {
  test('shows an empty board, zero scores, X to move, and Player vs Player mode', () => {
    start();
    assert.equal(cells().length, 9);
    assert.deepEqual(marks(), Array(9).fill(''));
    assert.equal(text('.score-x'), 'X: 0');
    assert.equal(text('.score-o'), 'O: 0');
    assert.equal(text('.status'), 'Player X Turn');
    assert.equal(text('.mode-button'), 'Mode: Player vs Player');
    assert.equal(text('.reset-button'), 'Reset Game');
  });

  test('every cell is a labelled button, and the status is announced politely', () => {
    start();
    assert.equal(cell(0).tagName, 'BUTTON');
    assert.equal(cell(0).getAttribute('aria-label'), 'Row 1, column 1, empty');
    assert.equal(cell(8).getAttribute('aria-label'), 'Row 3, column 3, empty');
    assert.equal(root.querySelector('.status').getAttribute('role'), 'status');
    assert.equal(root.querySelector('.status').getAttribute('aria-live'), 'polite');
  });
});

describe('two-player mode', () => {
  test('a tap places X, then O, and updates the turn text and cell label', () => {
    start();
    click(4);
    assert.equal(cell(4).textContent, 'X');
    assert.equal(cell(4).getAttribute('aria-label'), 'Row 2, column 2, X');
    assert.equal(text('.status'), 'Player O Turn');
    click(0);
    assert.equal(cell(0).textContent, 'O');
    assert.equal(text('.status'), 'Player X Turn');
  });

  test('tapping an occupied cell does nothing', () => {
    start();
    click(4);
    click(4);
    assert.equal(cell(4).textContent, 'X');
    assert.equal(text('.status'), 'Player O Turn');
  });

  test('colors: X and O get their own classes', () => {
    start();
    click(0); click(1);
    assert.ok(cell(0).classList.contains('is-x'));
    assert.ok(cell(1).classList.contains('is-o'));
  });

  test('a win shows the message, scores a point, highlights the line and freezes the board', () => {
    start();
    [0, 3, 1, 4, 2].forEach(click);
    assert.equal(text('.status'), 'Player X Wins!');
    assert.equal(text('.score-x'), 'X: 1');
    assert.deepEqual(cells().filter((c) => c.classList.contains('is-winning')).map((c) => c.dataset.index), ['0', '1', '2']);
    click(8);
    assert.equal(cell(8).textContent, '');
    assert.ok(cells().every((c) => c.getAttribute('aria-disabled') === 'true'));
  });

  test('a tie shows "Tie Game" and leaves the scores alone', () => {
    start();
    [0, 1, 2, 4, 3, 5, 7, 6, 8].forEach(click);
    assert.equal(text('.status'), 'Tie Game');
    assert.equal(text('.score-x'), 'X: 0');
    assert.equal(text('.score-o'), 'O: 0');
  });

  test('Reset clears the board but keeps the scores', () => {
    start();
    [0, 3, 1, 4, 2].forEach(click);
    root.querySelector('.reset-button').click();
    assert.deepEqual(marks(), Array(9).fill(''));
    assert.equal(text('.status'), 'Player X Turn');
    assert.equal(text('.score-x'), 'X: 1');
    assert.equal(cells().filter((c) => c.classList.contains('is-winning')).length, 0);
  });

  test('scores add up across several games', () => {
    start();
    [0, 3, 1, 4, 2].forEach(click);                       // X wins
    root.querySelector('.reset-button').click();
    [0, 3, 1, 4, 8, 5].forEach(click);                    // O wins
    root.querySelector('.reset-button').click();
    [0, 3, 1, 4, 2].forEach(click);                       // X wins again
    assert.equal(text('.score-x'), 'X: 2');
    assert.equal(text('.score-o'), 'O: 1');
  });

  test('never schedules a computer move', () => {
    start();
    click(0);
    assert.equal(timers.pending, 0);
  });
});

describe('mode switch', () => {
  test('toggles the label, clears the board and resets both scores', () => {
    start();
    [0, 3, 1, 4, 2].forEach(click);
    root.querySelector('.mode-button').click();
    assert.equal(text('.mode-button'), 'Mode: Player vs AI');
    assert.deepEqual(marks(), Array(9).fill(''));
    assert.equal(text('.score-x'), 'X: 0');
    root.querySelector('.mode-button').click();
    assert.equal(text('.mode-button'), 'Mode: Player vs Player');
  });
});

describe('computer opponent', () => {
  beforeEach(() => {
    start();
    root.querySelector('.mode-button').click();
  });

  test('moves after a half-second pause, not instantly', () => {
    click(0);
    assert.equal(marks().filter(Boolean).length, 1);
    assert.equal(timers.pending, 1);
    assert.deepEqual(timers.delays, [500]);
    timers.runAll();
    assert.equal(marks().filter(Boolean).length, 2);
    assert.equal(text('.status'), 'Player X Turn');
  });

  test('takes the center when it is free', () => {
    click(0);
    timers.runAll();
    assert.equal(cell(4).textContent, 'O');
  });

  test('blocks a winning move', () => {
    click(0); timers.runAll();   // X corner, O center
    click(1); timers.runAll();   // X threatens the top row, O must block at 2
    assert.equal(cell(2).textContent, 'O');
  });

  test('the person cannot play for O while the computer is thinking', () => {
    click(0);
    assert.ok(cells().every((c) => c.getAttribute('aria-disabled') === 'true'));
    click(8);
    assert.equal(cell(8).textContent, '');
    assert.equal(timers.pending, 1);
    timers.runAll();
    assert.equal(cell(4).textContent, 'O');
    assert.equal(cell(8).textContent, '');
  });

  test('cells open up again after the computer has moved', () => {
    click(0); timers.runAll();
    assert.equal(cell(8).getAttribute('aria-disabled'), 'false');
    assert.equal(cell(0).getAttribute('aria-disabled'), 'true'); // occupied
  });

  test('Reset during the computer\'s pause cancels its move', () => {
    click(0);
    root.querySelector('.reset-button').click();
    assert.equal(timers.pending, 0);
    timers.runAll();
    assert.deepEqual(marks(), Array(9).fill(''));
    assert.equal(text('.status'), 'Player X Turn');
  });

  test('switching mode during the computer\'s pause cancels its move', () => {
    click(0);
    root.querySelector('.mode-button').click();
    assert.equal(timers.pending, 0);
    assert.deepEqual(marks(), Array(9).fill(''));
  });

  test('a computer win scores a point for O and highlights its line', () => {
    // With the first-open-cell fallback: X0, O takes the center, X1, O blocks at 2, X3 -> O wins at 6
    click(0); timers.runAll();
    click(1); timers.runAll();
    assert.equal(cell(2).textContent, 'O');
    click(3); timers.runAll();
    assert.equal(text('.status'), 'Player O Wins!');
    assert.equal(text('.score-o'), 'O: 1');
    assert.equal(text('.score-x'), 'X: 0');
    assert.deepEqual(cells().filter((c) => c.classList.contains('is-winning')).map((c) => c.dataset.index), ['2', '4', '6']);
    assert.equal(timers.pending, 0);
  });

  test('a person who builds a double threat beats the computer and scores a point', () => {
    // X0, O center, X7, O (first open cell) 1, X6 makes two threats (3 and 8); O blocks 3; X8 wins
    click(0); timers.runAll();
    click(7); timers.runAll();
    assert.equal(cell(1).textContent, 'O');
    click(6); timers.runAll();
    assert.equal(cell(3).textContent, 'O');
    click(8);
    assert.equal(text('.status'), 'Player X Wins!');
    assert.equal(text('.score-x'), 'X: 1');
    assert.equal(timers.pending, 0);
  });
});

describe('destroy', () => {
  test('cancels a pending computer move and empties the root', () => {
    start();
    root.querySelector('.mode-button').click();
    click(0);
    assert.equal(timers.pending, 1);
    app.destroy();
    assert.equal(timers.pending, 0);
    assert.equal(root.children.length, 0);
    app = null;
  });
});
