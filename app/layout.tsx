import { type Metadata } from 'next';
import { type ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: 'CafeTab',
  description: 'A shared, append-only ledger for café customer tabs.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
