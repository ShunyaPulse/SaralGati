package com.saralgati.app.ui.onboarding

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
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

    val previewLang = OPTIONS[selectedIdx].appLang
    val scrollState = rememberScrollState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.background)
            .verticalScroll(scrollState)
            .padding(horizontal = 20.dp, vertical = 16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.SpaceBetween
    ) {
        // Top Header
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 8.dp, bottom = 16.dp)
        ) {
            Text(
                text = "🌐",
                fontSize = 40.sp,
                modifier = Modifier.padding(bottom = 6.dp)
            )
            Text(
                text = if (previewLang == "en") "Choose Your Language" else "अपनी भाषा चुनें",
                style = MaterialTheme.typography.titleLarge,
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.primary
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = if (previewLang == "en")
                    "Select how SaralGati should look and talk"
                else
                    "SaralGati कैसे दिखे और कैसे बोले, वो चुनें",
                style = MaterialTheme.typography.bodyMedium,
                fontSize = 14.sp,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onBackground.copy(alpha = 0.75f)
            )
        }

        // Language Choice Cards
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(vertical = 8.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
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

        Spacer(modifier = Modifier.height(16.dp))

        // Continue Button
        Button(
            onClick = {
                val chosen = OPTIONS[selectedIdx]
                onLanguageSelected(chosen.appLang, chosen.guidanceLang)
            },
            colors = ButtonDefaults.buttonColors(
                containerColor = MaterialTheme.colorScheme.primary,
                contentColor = MaterialTheme.colorScheme.onPrimary
            ),
            shape = RoundedCornerShape(14.dp),
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            elevation = ButtonDefaults.buttonElevation(defaultElevation = 4.dp)
        ) {
            Text(
                text = if (previewLang == "en") "Continue" else "आगे बढ़ें",
                fontSize = 18.sp,
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
    val borderColor = if (isSelected) {
        MaterialTheme.colorScheme.primary
    } else {
        MaterialTheme.colorScheme.outline.copy(alpha = 0.35f)
    }

    val containerColor = if (isSelected) {
        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
    } else {
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.45f)
    }

    val borderWidth = if (isSelected) 2.dp else 1.dp

    Surface(
        onClick = onClick,
        shape = RoundedCornerShape(14.dp),
        border = BorderStroke(borderWidth, borderColor),
        color = containerColor,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = emoji,
                fontSize = 26.sp,
                modifier = Modifier.padding(end = 12.dp)
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    fontSize = 17.sp,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    text = subtitle,
                    fontSize = 13.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Spacer(modifier = Modifier.width(8.dp))
            RadioButton(
                selected = isSelected,
                onClick = onClick,
                colors = RadioButtonDefaults.colors(
                    selectedColor = MaterialTheme.colorScheme.primary,
                    unselectedColor = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f)
                )
            )
        }
    }
}
