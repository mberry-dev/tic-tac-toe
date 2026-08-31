package com.example.tictactoeapp

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.TextView
import androidx.fragment.app.Fragment

// Top fragment — shows mode toggle, scores, turn, and game result
class TopFragment : Fragment() {

    private lateinit var playerTurn: TextView
    private lateinit var gameResult: TextView
    private lateinit var modeButton: Button
    private lateinit var xScoreText: TextView
    private lateinit var oScoreText: TextView

    var isAiMode = false

    // Scores persist across games until mode is switched
    private var xScore = 0
    private var oScore = 0

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        val view = inflater.inflate(R.layout.fragment_top, container, false)

        playerTurn = view.findViewById(R.id.playerTurn)
        gameResult  = view.findViewById(R.id.gameResult)
        modeButton  = view.findViewById(R.id.modeButton)
        xScoreText  = view.findViewById(R.id.xScoreText)
        oScoreText  = view.findViewById(R.id.oScoreText)

        // Restore state after rotation
        if (savedInstanceState != null) {
            isAiMode = savedInstanceState.getBoolean("isAiMode", false)
            xScore   = savedInstanceState.getInt("xScore", 0)
            oScore   = savedInstanceState.getInt("oScore", 0)
            updateModeButtonText()
            updateScoreDisplay()
        }

        // Toggle mode and reset board + scores when switched
        modeButton.setOnClickListener {
            isAiMode = !isAiMode
            xScore = 0
            oScore = 0
            updateModeButtonText()
            updateScoreDisplay()
            val bottomFragment = parentFragmentManager
                .findFragmentById(R.id.bottomFragment) as? BottomFragment
            bottomFragment?.resetGame()
        }

        return view
    }

    override fun onSaveInstanceState(outState: Bundle) {
        super.onSaveInstanceState(outState)
        outState.putBoolean("isAiMode", isAiMode)
        outState.putInt("xScore", xScore)
        outState.putInt("oScore", oScore)
    }

    // Called by BottomFragment when someone wins
    fun addScore(winner: Char) {
        if (winner == 'X') xScore++ else oScore++
        updateScoreDisplay()
    }

    // Update score TextViews with blue for X and red for O
    private fun updateScoreDisplay() {
        xScoreText.text = "X: $xScore"
        oScoreText.text = "O: $oScore"
    }

    private fun updateModeButtonText() {
        modeButton.text = if (isAiMode)
            getString(R.string.mode_ai)
        else
            getString(R.string.mode_pvp)
    }

    fun updateTurn(player: String) {
        playerTurn.text = getString(R.string.player_turn, player)
    }

    fun showResult(message: String) {
        gameResult.text = message
        playerTurn.text = ""
    }

    fun reset() {
        playerTurn.text = getString(R.string.player_turn, "X")
        gameResult.text  = ""
    }
}