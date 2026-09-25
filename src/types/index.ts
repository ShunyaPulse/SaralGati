export interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  provider: string;
  role: 'caregiver' | 'admin';
  created_at: Date;
  updated_at: Date;
}

export interface ElderProfile {
  id: string;
  caregiver_id: string;
  elder_name: string;
  phone_model: string | null;
  os_version: string | null;
  battery_status: number | null;
  emergency_contact: string | null;
  preferred_lang: 'hi' | 'en' | 'hinglish';
  /** Never sent to the caregiver browser; see toApiElder in lib/utils. */
  device_token?: string | null;
  /** Derived pairing flag returned by the caregiver-facing elder endpoints. */
  is_paired?: boolean;
  last_heartbeat: Date | null;
  /**
   * Whether a safe-zone exit also emails the caregiver. The dashboard alert is
   * recorded either way; see migrations/009.
   */
  safe_zone_email_enabled?: boolean;
  /** Last known fix reported with the heartbeat; see migrations/008. */
  last_lat: number | null;
  last_lng: number | null;
  location_accuracy_m: number | null;
  location_updated_at: Date | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  caregiver_name?: string; // For joins
}

export interface HabitRule {
  id: string;
  elder_id: string;
  rule_type: 'frequent_contact' | 'app_trigger' | 'time_routine' | 'location_trigger';
  rule_payload: Record<string, any>;
  confidence: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface AssistanceLog {
  id: string;
  elder_id: string;
  event_type: 'screen_confusion' | 'wrong_tap' | 'drop_off' | 'stuck_loop' | 'emergency' | 'battery_low';
  screen_name: string | null;
  app_package: string | null;
  duration_ms: number | null;
  metadata: Record<string, any> | null;
  resolved: boolean;
  created_at: Date;
  elder_name?: string; // For joins
}

export interface DeviceSession {
  elderId: string;
  caregiverId: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  page: number;
  limit: number;
  total: number;
}

export interface SyncHabitsPayload {
  device_token: string;
  habits: Array<{
    type: string;
    payload: Record<string, any>;
  }>;
  battery_level: number;
  timestamp: string;
}

export interface ReportStuckPayload {
  device_token: string;
  screen_name: string;
  app_package: string;
  duration_ms: number;
  loop_count?: number;
}

export interface AgentConfig {
  heartbeat_interval: number;
  sync_interval: number;
  log_level: 'debug' | 'info' | 'warn' | 'error';
}
