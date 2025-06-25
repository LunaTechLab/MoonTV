import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import AuthProvider from '../components/AuthProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: '金晖の影视TV',
  description: '影视聚合',
  manifest: '/manifest.json',
  themeColor: '#0f172a',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='zh-CN'>
      <body className={`${inter.className} min-h-screen text-gray-900`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
