export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin — ThisIsMyCard',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
