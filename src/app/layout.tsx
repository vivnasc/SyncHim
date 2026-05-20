import type { Metadata, Viewport } from 'next';
import './globals.css';
import { PWAInstall } from '@/components/PWAInstall';

export const metadata: Metadata = {
  title: 'SyncHim',
  description: 'A quiet 21-day method.',
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  applicationName: 'SyncHim',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SyncHim'
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180' }
    ]
  },
  formatDetection: { telephone: false }
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)',  color: '#1A1410' },
    { media: '(prefers-color-scheme: light)', color: '#1A1410' }
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
        <PWAInstall />
      </body>
    </html>
  );
}
