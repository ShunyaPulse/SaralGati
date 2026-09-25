import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Resolve a post-auth destination from an untrusted query param.
 * Only same-origin, in-app relative paths are allowed so a crafted
 * `callbackUrl` can never bounce the caregiver to an external site.
 */
export function safeRedirectPath(path: string | null | undefined, fallback = "/dashboard"): string {
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}

export type AlertSeverity = "high" | "medium" | "low";

/**
 * Alert severity is written by several producers with different casing and
 * vocabularies (the companion API defaults to "critical", the heartbeat logger
 * uses "medium", and the Android client sends uppercase). Canonicalise it so
 * counts and colours agree everywhere instead of silently missing alerts.
 */
export function normalizeSeverity(value: unknown): AlertSeverity {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (raw === "critical" || raw === "high" || raw === "severe") return "high";
  if (raw === "low" || raw === "info") return "low";
  return "medium";
}

export type DeviceStatus = "online" | "offline" | "unpaired";

/** How long after the last companion check-in a device is considered offline. */
export const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

/**
 * Derive whether the elder's phone is actually reachable. `elder_profiles.is_active`
 * only means the profile is enabled, so treating it as "device online" showed a
 * green dot for phones that had never been paired.
 */
export function getDeviceStatus(elder: {
  last_heartbeat?: Date | string | null;
  phone_model?: string | null;
}): DeviceStatus {
  if (!elder.last_heartbeat) {
    return elder.phone_model ? "offline" : "unpaired";
  }

  const lastSeen = new Date(elder.last_heartbeat).getTime();
  if (Number.isNaN(lastSeen)) return "unpaired";

  return Date.now() - lastSeen <= HEARTBEAT_STALE_MS ? "online" : "offline";
}

export function isDeviceOnline(elder: {
  last_heartbeat?: Date | string | null;
  phone_model?: string | null;
}): boolean {
  return getDeviceStatus(elder) === "online";
}

/**
 * The device token is a bearer credential for the elder's phone. It has no
 * business reaching the caregiver browser — where the elders store would also
 * persist it to localStorage — so expose a boolean pairing flag instead.
 */
export function toApiElder<T extends { device_token?: string | null }>(elder: T) {
  const { device_token, ...rest } = elder;
  return { ...rest, is_paired: Boolean(device_token) };
}
