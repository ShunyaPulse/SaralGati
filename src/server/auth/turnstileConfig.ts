import { ok, type ServiceResult } from '@/server/http';

export async function getTurnstileConfig(): Promise<ServiceResult> {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
    process.env.CLOUDFLARE_TURNSTILE_SITE_KEY ||
    '';

  return ok({ siteKey });
}
