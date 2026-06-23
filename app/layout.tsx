import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ThisIsMyCard — NFC Digital Business Cards',
  description: 'Premium NFC business cards. Setup your digital profile in minutes.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
