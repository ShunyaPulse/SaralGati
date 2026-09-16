package com.saralgati.app.data.local

import android.content.Context
import android.content.SharedPreferences

class LocalPrefs(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("saralgati_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ELDER_ID = "elder_id"
        private const val KEY_CAREGIVER_ID = "caregiver_id"
        private const val KEY_IS_PAIRED = "is_paired"
    }

    fun savePairingInfo(elderId: String, caregiverId: String) {
        prefs.edit()
            .putString(KEY_ELDER_ID, elderId)
            .putString(KEY_CAREGIVER_ID, caregiverId)
            .putBoolean(KEY_IS_PAIRED, true)
            .apply()
    }

    fun getElderId(): String? = prefs.getString(KEY_ELDER_ID, null)
    
    fun isPaired(): Boolean = prefs.getBoolean(KEY_IS_PAIRED, false)
    
    fun clear() {
        prefs.edit().clear().apply()
    }

    fun saveBoolean(key: String, value: Boolean) {
        prefs.edit().putBoolean(key, value).apply()
    }

    fun getBoolean(key: String, defaultValue: Boolean): Boolean {
        return prefs.getBoolean(key, defaultValue)
    }

    fun saveString(key: String, value: String) {
        prefs.edit().putString(key, value).apply()
    }

    fun getString(key: String, defaultValue: String): String {
        return prefs.getString(key, defaultValue) ?: defaultValue
    }
}
