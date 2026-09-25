import nodemailer, { type Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

/**
 * SMTP transport built from the same environment the OTP mail has always used.
 *
 * Returns `null` when credentials are missing so callers can tell "not
 * configured" apart from "delivery failed" instead of reporting a delivery that
 * never happened.
 */
export function createMailer(): Transporter | null {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) return null;

  const port = Number(process.env.SMTP_PORT) || 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port,
    secure: port === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    // Every timeout is bounded: an unreachable SMTP host must never hold an
    // elder's heartbeat request open.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
  });
}

/**
 * Best-effort delivery for notifications that are not the caller's reason to
 * exist - a safe-zone email must never fail the heartbeat that produced it.
 * Returns false (after logging) when SMTP is unconfigured or the send failed.
 */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const mailer = createMailer();

  if (!mailer) {
    console.warn('SMTP is not configured; skipping email notification.');
    return false;
  }

  try {
    await mailer.sendMail({
      from: process.env.SMTP_FROM || 'noreply@saralgati.com',
      ...message,
    });
    return true;
  } catch (error) {
    console.error('Email notification failed:', error);
    return false;
  }
}
