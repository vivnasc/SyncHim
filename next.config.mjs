import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Vercel: image optimisation ON por defeito. Mantém-se em `false`
  // apenas se quiseres servir Marina/* directamente do CDN sem
  // passar pelo /_next/image.
  images: {
    // unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' }
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '1mb'
    }
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source'
    });
    return config;
  },
  // Vercel: garante que content/ e versao-solteira/ ficam no bundle
  // das funções server (getKnotSession lê via fs.readFileSync).
  outputFileTracingIncludes: {
    '/[locale]/sessao/[n]': ['./content/**/*.md'],
    '/[locale]/dashboard':  ['./content/**/*.md'],
    '/[locale]/diagnostico': ['./content/**/*.md']
  }
};

export default withNextIntl(nextConfig);
