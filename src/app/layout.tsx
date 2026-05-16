import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SyncHim',
  description: 'A quiet 21-day method.',
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
