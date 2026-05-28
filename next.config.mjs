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
    },
    // Vercel: garante que content/ e versao-solteira/ ficam no bundle
    // das funções server (getKnotSession lê via fs.readFileSync).
    // Em Next 14 esta key vive dentro de experimental; foi promovida para
    // top-level em Next 15 — quando se fizer upgrade move-se para fora.
    outputFileTracingIncludes: {
      '/[locale]/sessao/[n]': ['./content/**/*.md'],
      '/[locale]/dashboard':  ['./content/**/*.md'],
      '/[locale]/diagnostico': ['./content/**/*.md']
    }
  },
  webpack(config) {
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source'
    });
    return config;
  }
};

export default withNextIntl(nextConfig);
