import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true
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
  }
};

export default withNextIntl(nextConfig);
