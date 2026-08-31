package com.example.tictactoeapp

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import androidx.fragment.app.Fragment

// Bottom fragment — contains the 3x3 grid and the Reset button
// Saves and restores full game state across orientation changes
class BottomFragment : Fragment() {

    // ── State ────────────────────────────────────────────────────────────────

    private lateinit var buttons: Array<Array<Button>>

    // Direct R.id references — avoids reflection via getIdentifier
    private val buttonIds = arrayOf(
        intArrayOf(R.id.b00, R.id.b01, R.id.b02),
        intArrayOf(R.id.b10, R.id.b11, R.id.b12),
        intArrayOf(R.id.b20, R.id.b21, R.id.b22)
    )

    // Logical board: ' ' = empty, 'X' or 'O' = claimed
    private var board = Array(3) { CharArray(3) { ' ' } }

    // Which player moves next
    private var currentPlayer = 'X'

    // True once the game ends (win or tie); blocks further moves
    private var gameOver = false

    // Handler used to post the AI move after a 0.5s delay
    private val handler = Handler(Looper.getMainLooper())

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.fragment_bottom, container, false)

        // Wire up the 9 buttons using direct R.id references
        buttons = Array(3) { r ->
            Array(3) { c ->
                val btn = view.findViewById<Button>(buttonIds[r][c])
                btn.setOnClickListener { makeMove(r, c) }
                btn
            }
        }

        // Reset button starts a fresh game
        view.findViewById<Button>(R.id.resetButton).setOnClickListener {
            resetGame()
        }

        return view
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        if (savedInstanceState != null) {
            restoreState(savedInstanceState)
        } else {
            getTopFragment().reset()
        }
    }

    // Cancel any pending AI move when the fragment is destroyed
    override fun onDestroyView() {
        super.onDestroyView()
        handler.removeCallbacksAndMessages(null)
    }

    // ── Orientation / State Handling ─────────────────────────────────────────

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)

        // Flatten 3x3 board into a 9-char string
        // A board full of empty spaces looks like "         "
        val flat = buildString {
            for (r in 0..2) for (c in 0..2) append(board[r][c])
        }

        outState.putString("board",         flat)
        outState.putChar("currentPlayer",   currentPlayer)
        outState.putBoolean("gameOver",     gameOver)
    }

    private fun restoreState(state: Bundle) {
        val flat      = state.getString("board", "         ")
        currentPlayer = state.getChar("currentPlayer", 'X')
        gameOver      = state.getBoolean("gameOver", false)

        // Rebuild board and sync button text and colors
        var idx = 0
        for (r in 0..2) {
            for (c in 0..2) {
                val ch = flat[idx++]
                board[r][c] = ch
                if (ch == ' ') {
                    buttons[r][c].text = ""
                } else {
                    buttons[r][c].text = ch.toString()
                    setButtonColor(buttons[r][c], ch)
                }
            }
        }

        // Restore TopFragment status display
        if (gameOver) {
            val winner = findWinnerOnBoard()
            val msg = if (winner != ' ')
                getString(R.string.player_wins, winner.toString())
            else
                getString(R.string.tie_game)
            getTopFragment().showResult(msg)
        } else {
            getTopFragment().updateTurn(currentPlayer.toString())
        }
    }

    // ── Game Logic ────────────────────────────────────────────────────────────

    // Handle a tap on cell (r, c) — only the human calls this directly
    private fun makeMove(r: Int, c: Int) {
        if (gameOver || board[r][c] != ' ') return

        placeMarker(r, c, currentPlayer)

        when {
            checkWinForPlayer(currentPlayer) -> {
                gameOver = true
                getTopFragment().addScore(currentPlayer)
                val msg = getString(R.string.player_wins, currentPlayer.toString())
                getTopFragment().showResult(msg)
            }
            board.all { row -> row.all { it != ' ' } } -> {
                gameOver = true
                getTopFragment().showResult(getString(R.string.tie_game))
            }
            else -> {
                currentPlayer = if (currentPlayer == 'X') 'O' else 'X'
                getTopFragment().updateTurn(currentPlayer.toString())

                // If AI mode is on and it is now O's turn, schedule the AI move
                if (getTopFragment().isAiMode && currentPlayer == 'O') {
                    disableGrid()
                    handler.postDelayed({ aiMove() }, 500)
                }
            }
        }
    }

    // AI uses strategy: win > block > center > random
    private fun aiMove() {
        if (gameOver || !isAdded) return

        val move = findWinningMove('O')      // try to win
            ?: findWinningMove('X')          // try to block player
            ?: takeCenterIfFree()            // take center
            ?: randomMove()                  // fallback to random

        if (move != null) {
            enableGrid()
            placeMarker(move.first, move.second, currentPlayer)

            when {
                checkWinForPlayer(currentPlayer) -> {
                    gameOver = true
                    getTopFragment().addScore(currentPlayer)
                    val msg = getString(R.string.player_wins, currentPlayer.toString())
                    getTopFragment().showResult(msg)
                }
                board.all { row -> row.all { it != ' ' } } -> {
                    gameOver = true
                    getTopFragment().showResult(getString(R.string.tie_game))
                }
                else -> {
                    currentPlayer = 'X'
                    getTopFragment().updateTurn(currentPlayer.toString())
                }
            }
        }
    }

    // Find a move that would win for the given player, or null if none
    private fun findWinningMove(player: Char): Pair<Int, Int>? {
        for (r in 0..2) {
            for (c in 0..2) {
                if (board[r][c] == ' ') {
                    board[r][c] = player
                    val wins = checkWinForPlayer(player)
                    board[r][c] = ' '
                    if (wins) return Pair(r, c)
                }
            }
        }
        return null
    }

    // Take center cell if it's free
    private fun takeCenterIfFree(): Pair<Int, Int>? {
        return if (board[1][1] == ' ') Pair(1, 1) else null
    }

    // Pick a random empty cell
    private fun randomMove(): Pair<Int, Int>? {
        val empty = mutableListOf<Pair<Int, Int>>()
        for (r in 0..2) for (c in 0..2) if (board[r][c] == ' ') empty.add(Pair(r, c))
        return if (empty.isEmpty()) null else empty.random()
    }

    // Place a marker on the board and update the button text and color
    private fun placeMarker(r: Int, c: Int, player: Char) {
        board[r][c]        = player
        buttons[r][c].text = player.toString()
        setButtonColor(buttons[r][c], player)
    }

    // X is blue, O is red
    private fun setButtonColor(button: Button, player: Char) {
        button.setTextColor(
            if (player == 'X')
                android.graphics.Color.rgb(0, 100, 200)
            else
                android.graphics.Color.rgb(200, 0, 0)
        )
    }

    // Returns true if the given player has three in a row, column, or diagonal
    private fun checkWinForPlayer(p: Char): Boolean {
        for (i in 0..2) {
            if (board[i][0] == p && board[i][1] == p && board[i][2] == p) return true
            if (board[0][i] == p && board[1][i] == p && board[2][i] == p) return true
        }
        if (board[0][0] == p && board[1][1] == p && board[2][2] == p) return true
        if (board[0][2] == p && board[1][1] == p && board[2][0] == p) return true
        return false
    }

    // Scans the board for a winner — used only when restoring after rotation
    private fun findWinnerOnBoard(): Char {
        for (p in listOf('X', 'O')) {
            if (checkWinForPlayer(p)) return p
        }
        return ' '
    }

    // Clear everything and restart
    fun resetGame() {
        handler.removeCallbacksAndMessages(null)
        board         = Array(3) { CharArray(3) { ' ' } }
        currentPlayer = 'X'
        gameOver      = false

        for (r in 0..2) for (c in 0..2) {
            buttons[r][c].text      = ""
            buttons[r][c].isEnabled = true
        }

        getTopFragment().reset()
    }

    // Disable all grid buttons so the human cannot tap while AI is thinking
    private fun disableGrid() {
        for (r in 0..2) for (c in 0..2) buttons[r][c].isEnabled = false
    }

    // Re-enable all empty grid buttons after the AI has moved
    private fun enableGrid() {
        for (r in 0..2) for (c in 0..2)
            if (board[r][c] == ' ') buttons[r][c].isEnabled = true
    }

    // Convenience function to get a reference to the TopFragment
    private fun getTopFragment(): TopFragment {
        return requireActivity().supportFragmentManager
            .findFragmentById(R.id.topFragment) as TopFragment
    }
}