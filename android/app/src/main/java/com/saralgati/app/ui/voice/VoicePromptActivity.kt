package com.saralgati.app.ui.voice

import android.app.Activity
import android.content.Intent
import android.os.Bundle
import android.speech.RecognizerIntent
import android.util.Log

class VoicePromptActivity : Activity() {
    companion object {
        private const val VOICE_REQUEST_CODE = 999
        private const val TAG = "VoicePromptActivity"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Make the window fully transparent so we don't disrupt the user's screen
        window.setBackgroundDrawableResource(android.R.color.transparent)
        
        try {
            val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
                putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                putExtra(RecognizerIntent.EXTRA_LANGUAGE, "hi-IN")
                putExtra(RecognizerIntent.EXTRA_PROMPT, "आप क्या पूछना चाहते हैं? (What do you want to ask?)")
            }
            startActivityForResult(intent, VOICE_REQUEST_CODE)
        } catch (e: Exception) {
            Log.e(TAG, "Speech recognition not available on this device", e)
            finish()
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        
        if (requestCode == VOICE_REQUEST_CODE && resultCode == RESULT_OK && data != null) {
            val results = data.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)
            val recognizedText = results?.firstOrNull()
            
            if (!recognizedText.isNullOrEmpty()) {
                Log.i(TAG, "Recognized text: $recognizedText")
                // Send broadcast to Accessibility Service with the question
                val intent = Intent("com.saralgati.app.ACTION_EXTRACT_AND_ASK").apply {
                    setPackage(packageName)
                    putExtra("question", recognizedText)
                }
                sendBroadcast(intent)
            }
        }
        
        // Finish this transparent activity to return immediately to the background app
        finish()
    }
}
