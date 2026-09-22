import { NextResponse } from 'next/server';
import versionData from '../../../../../../version.json';
import { cacheGet, cacheSet } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Check Redis cache first (3 min TTL) to prevent GitHub rate limiting
    const cacheKey = 'app_latest_version_meta';
    const cached = await cacheGet<typeof versionData>(cacheKey);
    if (cached && typeof cached.version_code === 'number') {
      return NextResponse.json({ success: true, data: cached });
    }

    // 2. Fetch latest release info from GitHub
    const res = await fetch('https://api.github.com/repos/ShunyaPulse/SaralGati/releases/tags/android-latest', {
      headers: {
        'User-Agent': 'SaralGati-App',
        'Accept': 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
    });

    if (res.ok) {
      const release = await res.json();
      if (release.body) {
        try {
          const parsed = JSON.parse(release.body);
          if (parsed && typeof parsed.version_code === 'number') {
            const data = {
              version_code: parsed.version_code,
              version_name: parsed.version_name || `1.1.${parsed.version_code}`,
              download_url: parsed.download_url || versionData.download_url,
              force_update: Boolean(parsed.force_update),
              changelog: parsed.changelog || versionData.changelog,
            };
            await cacheSet(cacheKey, data, 180);
            return NextResponse.json({ success: true, data });
          }
        } catch {
          // If body is not JSON, proceed to fallback
        }
      }
    }
  } catch (err) {
    console.error('Error fetching dynamic version from GitHub release:', err);
  }

  // 3. Fallback to bundled version.json
  return NextResponse.json({
    success: true,
    data: versionData,
  });
}

