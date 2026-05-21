import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PwaRegistration } from '@/components/PwaRegistration';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://synchim.vercel.app';
const DESCRIPTION =
  'Método silencioso de 21 dias para mulheres em relações sérias, casadas ou em construção, que querem ver o padrão antigo que as está a tirar de sincronia.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'SyncHim', template: '%s · SyncHim' },
  description: DESCRIPTION,
  manifest: '/manifest.webmanifest',
  applicationName: 'SyncHim',
  appleWebApp: {
    capable: true,
    title: 'SyncHim',
    statusBarStyle: 'black-translucent'
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/icon-192.png', sizes: '192x192' }]
  },
  openGraph: {
    type: 'website',
    siteName: 'SyncHim',
    title: 'SyncHim',
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'pt_PT',
    alternateLocale: ['en_US']
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SyncHim',
    description: DESCRIPTION
  },
  robots: { index: true, follow: true }
};

export const viewport: Viewport = {
  themeColor: '#1A1410',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
        <PwaRegistration />
      </body>
    </html>
  );
}
