package com.example.tictactoeapp

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity

// Host activity — simply loads the layout that contains both fragments
class MainActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
    }
}



