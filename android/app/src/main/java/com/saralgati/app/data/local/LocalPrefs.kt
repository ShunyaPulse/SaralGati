package com.saralgati.app.data.local

import android.content.Context
import android.content.SharedPreferences

class LocalPrefs(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("saralgati_prefs", Context.MODE_PRIVATE)

    companion object {
        private const val KEY_ELDER_ID = "elder_id"
        private const val KEY_CAREGIVER_ID = "caregiver_id"
        private const val KEY_DEVICE_TOKEN = "device_token"
        private const val KEY_IS_PAIRED = "is_paired"
    }

    fun savePairingInfo(elderId: String, caregiverId: String, deviceToken: String? = null) {
        val editor = prefs.edit()
            .putString(KEY_ELDER_ID, elderId)
            .putString(KEY_CAREGIVER_ID, caregiverId)
            .putBoolean(KEY_IS_PAIRED, true)
        if (deviceToken != null) {
            editor.putString(KEY_DEVICE_TOKEN, deviceToken)
        }
        editor.apply()
    }

    fun saveDeviceToken(token: String) {
        prefs.edit().putString(KEY_DEVICE_TOKEN, token).apply()
    }

    fun getDeviceToken(): String? = prefs.getString(KEY_DEVICE_TOKEN, null)

    fun getAuthToken(): String? = getDeviceToken() ?: getElderId()

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
