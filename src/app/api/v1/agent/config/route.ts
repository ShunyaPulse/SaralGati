import { NextResponse } from 'next/server';
import { validateDeviceToken } from '@/lib/agent-auth';
import { query, queryOne } from '@/lib/db';
import { cacheGet, cacheSet } from '@/lib/redis';
import { ElderProfile, HabitRule } from '@/types';

// Hardcoded guidance strings based on language
const getGuidanceStrings = (lang: string) => {
  if (lang === 'hi') {
    return {
      welcome: "नमस्ते! मैं आपकी कैसे मदद कर सकता हूँ?",
      stuck_prompt: "ऐसा लगता है कि आपको यहाँ कुछ परेशानी हो रही है। क्या मैं मदद करूँ?",
      calling_contact: "आपके इमरजेंसी संपर्क को कॉल कर रहा हूँ...",
      success: "काम हो गया!",
      error: "क्षमा करें, कुछ गलत हो गया।"
    };
  } else if (lang === 'en') {
    return {
      welcome: "Hello! How can I help you today?",
      stuck_prompt: "It looks like you might be stuck. Would you like some help?",
      calling_contact: "Calling your emergency contact...",
      success: "Task completed successfully!",
      error: "Sorry, something went wrong."
    };
  } else {
    // Hinglish
    return {
      welcome: "Namaste! Main aapki kaise madad kar sakta hoon?",
      stuck_prompt: "Lagta hai aapko yahan madad chahiye. Kya main help karun?",
      calling_contact: "Aapke emergency contact ko call kar raha hoon...",
      success: "Kaam ho gaya!",
      error: "Sorry, kuch galat ho gaya."
    };
  }
};

export async function GET(request: Request) {
  try {
    const authResult = await validateDeviceToken(request);
    
    if (!authResult) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { elderId } = authResult;
    const cacheKey = `agent-config:${elderId}`;

    // Try cache first
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json({ success: true, data: cached });
    }

    // Fetch elder profile
    const elder = await queryOne<ElderProfile>(
      `SELECT preferred_lang, emergency_contact FROM elder_profiles WHERE id = $1`,
      [elderId]
    );

    if (!elder) {
      return NextResponse.json({ success: false, error: 'Elder not found' }, { status: 404 });
    }

    // Fetch active habits
    const habits = await query<HabitRule>(
      `SELECT * FROM habit_rules WHERE elder_id = $1`,
      [elderId]
    );

    const config = {
      guidance_strings: getGuidanceStrings(elder.preferred_lang || 'en'),
      emergency_contact: elder.emergency_contact,
      habit_shortcuts: habits,
      updated_at: new Date().toISOString()
    };

    // Cache for 5 minutes
    await cacheSet(cacheKey, config, 300);

    return NextResponse.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching agent config:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
