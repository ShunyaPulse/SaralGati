import type { GuidanceLang } from '@/lib/guidance/guidanceLanguage';

import type { IntentDefinition } from './types';

export const INTENT_HINDI_EXPLANATIONS: Record<string, string> = {
  video_call: 'Video call karne ke liye yahan diye gaye button par dabayein.',
  call: 'Call lagane ke liye yahan dabayein.',
  chat_message: 'Message ya chat karne ke liye yahan dabayein.',
  voice_message: 'Bolkar sandesh (voice note) bhejne ke liye mic par dabayein.',
  search: 'Khojne (Search) ke liye yahan dabayein.',
  camera_photo: 'Photo khinchne ya camera kholne ke liye yahan dabayein.',
  gallery_media: 'Photo ya gallery dekhne ke liye yahan dabayein.',
  play_video_music: 'Chalane (Play) ke liye yahan dabayein.',
  pause_stop: 'Rokne (Pause/Stop) ke liye yahan dabayein.',
  order_food_shopping: 'Order karne ya kharidne ke liye yahan dabayein.',
  payment_upi: 'Paise bhejne ya bhugtan (UPI) ke liye yahan dabayein.',
  recharge_mobile: 'Recharge ya bill bharne ke liye yahan dabayein.',
  settings_options: 'Settings ya anya vikalp dekhne ke liye yahan dabayein.',
  delete_remove: 'Hatane ya delete karne ke liye yahan dabayein.',
  share_forward: 'Share karne ya aage bhejne ke liye yahan dabayein.',
  add_new: 'Naya jodne ke liye yahan plus (+) button par dabayein.',
  status_story: 'Status dekhne ke liye yahan dabayein.',
  mic_voice_search: 'Bolkar awaaz se search karne ke liye yahan mic par dabayein.',
  back_close: 'Peeche jaane ke liye yahan back (Back) button dabayein.',
  download_save: 'Download ya save karne ke liye yahan dabayein.',
  help_assistance: 'Madad ya sahayata paane ke liye yahan dabayein.',
  profile_account: 'Apni profile ya khata dekhne ke liye yahan dabayein.',
  alarm_clock_time: 'Alarm ya samay set karne ke liye yahan dabayein.',
  weather_mausam: 'Mausam ki jankari dekhne ke liye yahan dabayein.',
  flashlight_torch: 'Torch ya roshni chalu/band karne ke liye yahan dabayein.',
  train_railway: 'Train ya ticket ki jankari ke liye yahan dabayein.',
  cab_auto_ride: 'Gaadi ya cab book karne ke liye yahan dabayein.',
  medicine_health: 'Dawa ya swasthya sambandhi jankari ke liye yahan dabayein.',
  battery_power: 'Battery ki sthiti dekhne ke liye yahan dabayein.',
  wifi_internet: 'Internet ya Wi-Fi ke liye yahan dabayein.',
  bluetooth_connect: 'Bluetooth connect karne ke liye yahan dabayein.',
  calculator_math: 'Calculator ya hisab ke liye yahan dabayein.',
  notes_reminder: 'Notes likhne ya yaad rakhne ke liye yahan dabayein.',
  news_samachar: 'Taaza samachar padhne ke liye yahan dabayein.',
  whatsapp_group: 'Group dekhne ya kholne ke liye yahan dabayein.',
  read_screen_text: 'Screen ki awaaz sunne ke liye yahan dabayein.',
  zoom_magnify: 'Akshar bade ya zoom karne ke liye yahan dabayein.',
  volume_sound: 'Awaaz kam ya tez karne ke liye yahan dabayein.',
  mute_silent: 'Phone ko silent ya shant karne ke liye yahan dabayein.',
  location_map: 'Raasta ya map dekhne ke liye yahan dabayein.',
  otp_verification: 'OTP ya code dekhne ke liye yahan dabayein.',
  block_spam: 'Number block karne ke liye yahan dabayein.',
  brightness_screen: 'Screen ki chamak (Brightness) ke liye yahan dabayein.',
  notification_alert: 'Notification dekhne ke liye yahan ghanti par dabayein.',
  copy_paste: 'Copy ya paste karne ke liye yahan dabayein.',
  update_app: 'App update karne ke liye yahan dabayein.',
  call_history_logs: 'Haal ki call list dekhne ke liye yahan dabayein.',
  contacts_addressbook: 'Sampark (Contacts) suchi dekhne ke liye yahan dabayein.',
  screenshot_capture: 'Screenshot lene ke liye yahan dabayein.',
  language_hindi: 'Bhasha badalne ya Hindi karne ke liye yahan dabayein.',
  check_balance: 'Apna balance ya khata dekhne ke liye yahan dabayein.',
};

/**
 * The same table for an English-speaking elder. Keyed by intent id, so a test
 * can prove the two tables cover exactly the same intents and that no English
 * line ever leaks Devanagari.
 */
export const INTENT_ENGLISH_EXPLANATIONS: Record<string, string> = {
  video_call: 'Tap the button shown here to start a video call.',
  call: 'Tap here to make a call.',
  chat_message: 'Tap here to send a message or open the chat.',
  voice_message: 'Tap the mic to send a voice message.',
  search: 'Tap here to search.',
  camera_photo: 'Tap here to open the camera or take a photo.',
  gallery_media: 'Tap here to see your photos and gallery.',
  play_video_music: 'Tap here to play.',
  pause_stop: 'Tap here to pause or stop.',
  order_food_shopping: 'Tap here to order or buy.',
  payment_upi: 'Tap here to send money or pay.',
  recharge_mobile: 'Tap here to recharge or pay a bill.',
  settings_options: 'Tap here to open settings or more options.',
  delete_remove: 'Tap here to delete or remove it.',
  share_forward: 'Tap here to share or forward.',
  add_new: 'Tap the plus (+) button here to add something new.',
  status_story: 'Tap here to see the status updates.',
  mic_voice_search: 'Tap the mic here to search by speaking.',
  back_close: 'Tap Back here to go to the previous screen.',
  download_save: 'Tap here to download or save.',
  help_assistance: 'Tap here for help and support.',
  profile_account: 'Tap here to see your profile and account.',
  alarm_clock_time: 'Tap here to set an alarm or the time.',
  weather_mausam: 'Tap here to see the weather.',
  flashlight_torch: 'Tap here to turn the torch on or off.',
  train_railway: 'Tap here for train and ticket information.',
  cab_auto_ride: 'Tap here to book a cab or auto.',
  medicine_health: 'Tap here for medicines and health information.',
  battery_power: 'Tap here to see the battery status.',
  wifi_internet: 'Tap here for internet and Wi-Fi.',
  bluetooth_connect: 'Tap here to connect Bluetooth.',
  calculator_math: 'Tap here for the calculator.',
  notes_reminder: 'Tap here to write a note or reminder.',
  news_samachar: 'Tap here to read the news.',
  whatsapp_group: 'Tap here to open the group.',
  read_screen_text: 'Tap here to hear the screen read out loud.',
  zoom_magnify: 'Tap here to make the text bigger or zoom.',
  volume_sound: 'Tap here to turn the sound up or down.',
  mute_silent: 'Tap here to make the phone silent.',
  location_map: 'Tap here to see the map and directions.',
  otp_verification: 'Tap here to see the OTP or code.',
  block_spam: 'Tap here to block the number.',
  brightness_screen: 'Tap here to change the screen brightness.',
  notification_alert: 'Tap the bell here to see notifications.',
  copy_paste: 'Tap here to copy or paste.',
  update_app: 'Tap here to update the app.',
  call_history_logs: 'Tap here to see the recent calls.',
  contacts_addressbook: 'Tap here to see your contacts.',
  screenshot_capture: 'Tap here to take a screenshot.',
  language_hindi: 'Tap here to change the language.',
  check_balance: 'Tap here to see your balance or account.',
};

export function getIntentExplanation(
  intent: IntentDefinition | null,
  lang: GuidanceLang = 'hi',
): string {
  const english = lang === 'en';
  if (!intent) {
    return english
      ? 'Tap the button shown here to continue.'
      : 'Aage badhne ke liye yahan diye gaye button par dabayein.';
  }
  if (english) {
    return INTENT_ENGLISH_EXPLANATIONS[intent.id] || `Tap here for ${intent.name}.`;
  }
  return INTENT_HINDI_EXPLANATIONS[intent.id] || `${intent.name} ke liye yahan dabayein.`;
}
