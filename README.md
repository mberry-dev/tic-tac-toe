# Tic-Tac-Toe (Android)

An Android app for Tic-Tac-Toe with a two-player mode and a computer opponent. It keeps score across games and keeps your game in place when you rotate the phone.

Built in Kotlin for CIS 436 (Mobile Application Development) at the University of Michigan-Dearborn.

## Features

- **Two modes:** Player vs Player, or Player vs AI. A button at the top switches modes (this also clears the board and the scores).
- **AI opponent:** looks for a winning move first, then blocks yours, then takes the center, then picks a random open cell. It pauses half a second before moving and locks the board while it "thinks".
- **Win and tie detection** for all three rows, columns and both diagonals. The board freezes when the game ends.
- **Score tracking** for X and O across games. Ties don't change the score, and the Reset button clears the board without clearing the score.
- **Turn and result display**, with X in blue and O in red.
- **Rotation support:** the board, whose turn it is, the scores and the result survive turning the device. There is a separate landscape layout.
- **Accessibility:** every cell has a content description.

## How it's built

- Two fragments inside one activity: `TopFragment` (mode toggle, scores, turn and result) and `BottomFragment` (the 3x3 grid, game logic and the AI)
- `BottomFragment` tells `TopFragment` when a game is won or tied, so the two halves stay in sync
- Game state is saved and restored with the fragment's saved instance state
- Portrait and landscape layouts in `res/layout` and `res/layout-land`

## Testing

I tested the app on three Pixel emulator profiles (Pixel 2, Pixel 4 and Pixel 7) with a written test plan: [`TicTacToeApp/Test Plan.xlsx`](TicTacToeApp/Test%20Plan.xlsx). It has 33 test cases over three days (startup and UI, game logic, scoring and winning), and each one was run on all three devices.

## Run it

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
└── TicTacToeApp/
    ├── Test Plan.xlsx
    └── app/src/main/
        ├── java/com/example/tictactoeapp/
        │   ├── MainActivity.kt      # Hosts the two fragments
        │   ├── TopFragment.kt       # Mode toggle, scores, turn and result
        │   └── BottomFragment.kt    # Board, game logic and AI
        └── res/                     # Layouts (portrait and landscape), strings, colors
```
