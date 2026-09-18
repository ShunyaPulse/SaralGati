/**
 * Server-side Cloudflare Turnstile token validation
 */
export async function verifyTurnstile(token: string, remoteip?: string): Promise<boolean> {
  if (!token) return false;

  const secret = process.env.TURNSTILE_SECRET_KEY || process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  if (!secret) {
    console.error('Turnstile secret key is not configured in environment variables');
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', secret);
    formData.append('response', token);
    if (remoteip && remoteip !== 'anonymous') {
      formData.append('remoteip', remoteip);
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await res.json();
    if (!data.success) {
      console.warn('[Turnstile siteverify rejected]:', data);
    }
    return !!data.success;
  } catch (error) {
    console.error('Turnstile verification network error:', error);
    return false;
  }
}
