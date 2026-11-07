import dns from 'node:dns/promises';

// In-memory cache for deliverable domain MX records (24 hours TTL)
const mxDomainCache = new Map<string, { valid: boolean; expiresAt: number }>();

// Pre-seeded high-trust email providers that never require external DNS lookups
const TRUSTED_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.in',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
  'zoho.com',
  'aol.com',
]);

// RFC 2606 and RFC 6761 reserved domains that must never receive external emails
const RESERVED_DOMAINS = new Set([
  'example.com',
  'example.org',
  'example.net',
  'example.edu',
  'test',
  'invalid',
  'localhost',
  'local',
]);

/**
 * Checks whether an email address is an RFC test/probe domain or known scanner pattern.
 * If true, it should be silently tarpitted (fake success without calling SMTP).
 */
export function isScannerOrTestProbe(email: string): boolean {
  const clean = email.trim().toLowerCase();
  const atIdx = clean.lastIndexOf('@');
  if (atIdx === -1) return true;

  const localPart = clean.slice(0, atIdx);
  const domain = clean.slice(atIdx + 1);

  // 1. Reserved / RFC test domains
  if (
    RESERVED_DOMAINS.has(domain) ||
    domain.endsWith('.example') ||
    domain.endsWith('.test') ||
    domain.endsWith('.invalid') ||
    domain.endsWith('.localhost') ||
    domain.endsWith('.local')
  ) {
    return true;
  }

  // 2. Typical vulnerability probe prefixes: probe.<random>, scan.<random>, test.<random>, pentest.<random>
  if (/^(probe|scanner?|pentest|dummy|fake|fuzz|vuln|exploit|injected)[\.\-_]?[a-z0-9]*$/i.test(localPart)) {
    return true;
  }

  return false;
}

/**
 * Pre-flight verification that the domain can actually receive mail via DNS MX lookup.
 * Protects Gmail/SMTP reputation from bounces (Null MX, non-existent domains).
 */
export async function verifyDomainHasDeliverableMx(domain: string): Promise<boolean> {
  const cleanDomain = domain.trim().toLowerCase();
  if (TRUSTED_EMAIL_DOMAINS.has(cleanDomain)) return true;

  const cached = mxDomainCache.get(cleanDomain);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.valid;
  }

  try {
    const records = await dns.resolveMx(cleanDomain);
    if (!records || records.length === 0) {
      mxDomainCache.set(cleanDomain, { valid: false, expiresAt: now + 3600_000 });
      return false;
    }

    // RFC 7505 Null MX: exchange is "." (or empty) indicating domain explicitly does NOT receive email
    const hasValidMx = records.some((r) => r.exchange && r.exchange.trim() !== '.' && r.exchange.trim() !== '');
    mxDomainCache.set(cleanDomain, { valid: hasValidMx, expiresAt: now + (hasValidMx ? 86400_000 : 3600_000) });
    return hasValidMx;
  } catch {
    // NXDOMAIN or DNS error -> Domain cannot receive email
    mxDomainCache.set(cleanDomain, { valid: false, expiresAt: now + 3600_000 });
    return false;
  }
}
