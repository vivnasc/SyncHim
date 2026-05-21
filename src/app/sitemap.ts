import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://synchim.vercel.app';
  const now = new Date();
  const locales = ['pt', 'en'] as const;
  const paths = ['', '/diagnostico', '/login', '/garantia', '/privacidade', '/termos'];

  const entries: MetadataRoute.Sitemap = [];
  for (const locale of locales) {
    for (const p of paths) {
      entries.push({
        url: `${base}/${locale}${p}`,
        lastModified: now,
        changeFrequency: p === '' ? 'weekly' : 'monthly',
        priority: p === '' ? 1.0 : 0.6
      });
    }
  }
  return entries;
}
