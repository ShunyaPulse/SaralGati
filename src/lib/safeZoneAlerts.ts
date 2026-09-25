import { safeZoneExitEmail, shouldEmailSafeZoneExit } from './alerts';
import { sendMail, type MailMessage } from './mailer';
import type { GeoPoint, Geofence } from './geo';

/**
 * What happened to one safe-zone exit notification.
 *
 * Returned - and logged by the caller - instead of a boolean so "the caregiver
 * muted this elder" is never confused with "delivery failed" while reading the
 * server logs.
 */
export type SafeZoneExitMailOutcome = 'sent' | 'muted' | 'no-recipient' | 'failed';

export interface SafeZoneExitNotice {
  elderName: string;
  fence: Geofence;
  /** Rounded metres between the fix and the zone centre. */
  distanceM: number;
  point: GeoPoint;
  /** Caregiver account address, or null when the elder has no linked user. */
  caregiverEmail: string | null;
  /**
   * The raw `elder_profiles.safe_zone_email_enabled` value. `null`/`undefined`
   * means the preference was not read (see migrations/009) and keeps mailing.
   */
  emailPreference: boolean | null | undefined;
  at?: Date;
}

export type MailSender = (message: MailMessage) => Promise<boolean>;

/**
 * Email the caregiver about a safe-zone exit, unless that elder is muted.
 *
 * The caller writes the dashboard alert *before* this runs, so a mute only ever
 * suppresses the email - the exit still appears in the alert feed. The sender is
 * injectable so both directions (muted and unmuted) are provable in tests without
 * an SMTP server, and so the outcome can be logged rather than guessed at.
 */
export async function notifySafeZoneExit(
  notice: SafeZoneExitNotice,
  send: MailSender = sendMail
): Promise<SafeZoneExitMailOutcome> {
  if (!shouldEmailSafeZoneExit(notice.emailPreference)) return 'muted';
  if (!notice.caregiverEmail) return 'no-recipient';

  const message = safeZoneExitEmail({
    elderName: notice.elderName,
    fence: notice.fence,
    distanceM: notice.distanceM,
    point: notice.point,
    at: notice.at,
  });

  const delivered = await send({ to: notice.caregiverEmail, ...message });
  return delivered ? 'sent' : 'failed';
}
