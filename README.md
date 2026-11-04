# Tic-Tac-Toe

Tic-Tac-Toe with a two-player mode and a computer opponent, built twice: as an **Android app** (Kotlin) and as a **web version** (JavaScript) you can play right in the browser.

**Play it:** https://mberry-dev.github.io/tic-tac-toe/

Both versions follow the same rules: X always goes first, the score is kept across games, Reset clears the board but not the score, and switching modes clears both.

## The computer opponent

It plays by simple priorities, checked in this order each turn:

1. Win, if it can complete three in a row
2. Block you, if you could win next turn
3. Take the center
4. Otherwise pick a random open cell

It pauses half a second before moving, and you can't tap for it while it "thinks". It is a rule-based player, not a perfect one, so a careful player can beat it by setting up two threats at once.

## Web version

Plain HTML, CSS and JavaScript with no framework and no build step.

- Works on phones, tablets and desktops, in light and dark mode
- Playable with the keyboard, with labelled cells and status changes announced to screen readers
- The winning line is highlighted

### Run it locally

You need [Node.js](https://nodejs.org) 20 or newer. The page uses JavaScript modules, which browsers won't load from a file opened directly, so serve the folder:

```bash
cd web
npm install
npm start
```

Then open the address it prints (usually http://localhost:3000).

### Tests

58 automated tests with Node's built-in test runner:

- **Game logic** (37): every winning line for both players, ties, a win on the last cell, rejected moves, the AI's win/block/center/random order, and a simulation checking the computer beats random play
- **Interface** (21): the page is loaded in a simulated browser to check taps, turns, scores, reset, mode switching, and that the computer's move is cancelled if you reset or switch mode while it is thinking

```bash
cd web
npm install
npm test
```

The tests run automatically on every change, and the site is published to GitHub Pages only when they pass.

## Android version

Built in Kotlin for CIS 436 (Mobile Application Development) at the University of Michigan-Dearborn.

- **Score tracking** for X and O, with X in blue and O in red
- **Rotation support:** the board, whose turn it is, the scores and the result survive turning the device. There is a separate landscape layout.
- **Accessibility:** every cell has a content description

### How it's built

- Two fragments inside one activity: `TopFragment` (mode toggle, scores, turn and result) and `BottomFragment` (the 3x3 grid, game logic and the AI)
- `BottomFragment` tells `TopFragment` when a game is won or tied, so the two halves stay in sync
- Game state is saved and restored with the fragment's saved instance state

### Testing

I tested the app on three Pixel emulator profiles (Pixel 2, Pixel 4 and Pixel 7) with a written test plan: [`TicTacToeApp/Test Plan.xlsx`](TicTacToeApp/Test%20Plan.xlsx). It has 33 test cases over three days (startup and UI, game logic, scoring and winning), and each one was run on all three devices.

### Run it

You need [Android Studio](https://developer.android.com/studio).

1. Clone the repo:
   ```bash
   git clone https://github.com/mberry-dev/tic-tac-toe.git
   ```
2. In Android Studio choose **Open** and select the `TicTacToeApp` folder inside the repo.
3. Let Gradle finish syncing, then run the app on an emulator or a connected phone (Android 7.0 / API 24 or newer).

## Project structure

```
tic-tac-toe/
├── web/                         # Web version
│   ├── index.html, style.css
│   ├── src/
│   │   ├── game.js              # Rules, win detection, AI (no browser code)
│   │   ├── ui.js                # Builds the page and handles taps
│   │   └── main.js              # Starts the game
│   └── tests/                   # Game logic and interface tests
├── TicTacToeApp/                # Android version
│   ├── Test Plan.xlsx
│   └── app/src/main/
│       ├── java/com/example/tictactoeapp/
│       │   ├── MainActivity.kt      # Hosts the two fragments
│       │   ├── TopFragment.kt       # Mode toggle, scores, turn and result
│       │   └── BottomFragment.kt    # Board, game logic and AI
│       └── res/                     # Layouts (portrait and landscape), strings, colors
└── .github/workflows/web.yml    # Runs the web tests and publishes the site
```
