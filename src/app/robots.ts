import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://saralgati-685823552970.asia-south1.run.app';
  
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/about', '/privacy-policy', '/terms', '/contact'],
        disallow: ['/dashboard/', '/elders/', '/alerts/', '/settings/', '/api/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
