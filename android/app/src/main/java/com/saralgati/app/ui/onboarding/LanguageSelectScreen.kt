package com.saralgati.app.ui.onboarding

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * Preset language combos: (appLanguage, guidanceLanguage).
 *
 * Option 1 → Hindi UI + Hindi guidance
 * Option 2 → English UI + Hindi guidance
 * Option 3 → English UI + English guidance
 */
private data class LangOption(
    val appLang: String,
    val guidanceLang: String,
    val title: String,
    val subtitle: String,
    val emoji: String
)

private val OPTIONS = listOf(
    LangOption(
        appLang = "hi",
        guidanceLang = "hi",
        title = "हिंदी में सब कुछ",
        subtitle = "ऐप और बोलकर गाइड — दोनों हिंदी में",
        emoji = "🇮🇳"
    ),
    LangOption(
        appLang = "en",
        guidanceLang = "hi",
        title = "English App, Hindi Guide",
        subtitle = "App English में, बोलकर गाइड हिंदी में",
        emoji = "🗣️"
    ),
    LangOption(
        appLang = "en",
        guidanceLang = "en",
        title = "Everything in English",
        subtitle = "App and spoken guidance — both in English",
        emoji = "🇬🇧"
    )
)

@Composable
fun LanguageSelectScreen(
    currentAppLang: String,
    currentGuidanceLang: String,
    onLanguageSelected: (appLang: String, guidanceLang: String) -> Unit
) {
    var selectedIdx by remember {
        mutableIntStateOf(
            OPTIONS.indexOfFirst {
                it.appLang == currentAppLang && it.guidanceLang == currentGuidanceLang
            }.coerceAtLeast(0)
        )
    }

    // Title/subtitle follow the *preview* app language of the selected option
    val previewLang = OPTIONS[selectedIdx].appLang

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .padding(horizontal = 24.dp, vertical = 32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top Header
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.padding(top = 24.dp)
        ) {
            Text(
                text = "🌐",
                fontSize = 54.sp,
                modifier = Modifier.padding(bottom = 12.dp)
            )
            Text(
                text = if (previewLang == "en") "Choose Your Language" else "अपनी भाषा चुनें",
                style = MaterialTheme.typography.headlineMedium,
                fontWeight = FontWeight.ExtraBold,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = if (previewLang == "en")
                    "Select how SaralGati should look and talk"
                else
                    "SaralGati कैसे दिखे और कैसे बोले, वो चुनें",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.75f)
            )
        }

        // Language Choice Cards
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(14.dp)
        ) {
            OPTIONS.forEachIndexed { idx, opt ->
                LanguageCard(
                    emoji = opt.emoji,
                    title = opt.title,
                    subtitle = opt.subtitle,
                    isSelected = selectedIdx == idx,
                    onClick = { selectedIdx = idx }
                )
            }
        }

        // Continue Button
        Button(
            onClick = {
                val chosen = OPTIONS[selectedIdx]
                onLanguageSelected(chosen.appLang, chosen.guidanceLang)
            },
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = Color.White
            ),
            shape = RoundedCornerShape(16.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(60.dp),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 6.dp)
        ) {
            Text(
                text = if (previewLang == "en") "Continue" else "आगे बढ़ें",
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold
            )
        }
    }
}

@Composable
private fun LanguageCard(
    emoji: String,
    title: String,
    subtitle: String,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val borderColor = if (isSelected) MaterialTheme.colorScheme.primary else Color(0xFFD1D5DB)
    val bgColor = if (isSelected) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f) else Color(0xFFF9FAFB)
    val borderWidth = if (isSelected) 3.dp else 1.dp

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        border = BorderStroke(borderWidth, borderColor),
        color = bgColor,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = emoji,
                fontSize = 28.sp,
                modifier = Modifier.padding(end = 14.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 20.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = subtitle,
                    fontSize = 14.sp,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            RadioButton(
                selected = isSelected,
                onClick = onClick,
                colors = RadioButtonDefaults.colors(selectedColor = MaterialTheme.colorScheme.primary)
            )
        }
    }
}
