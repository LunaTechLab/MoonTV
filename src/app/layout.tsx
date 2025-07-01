import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';

import AuthProvider from '../components/AuthProvider';
import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: process.env.SITE_NAME || 'MoonTV',
  description: '影视聚合',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const siteName = process.env.SITE_NAME || 'MoonTV';
  const announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';

  return (
    <html lang='zh-CN' suppressHydrationWarning>
      <body
        className={`${inter.className} min-h-screen bg-white text-gray-900 dark:bg-black dark:text-gray-200`}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='system'
          enableSystem
          disableTransitionOnChange
        >
          <SiteProvider siteName={siteName} announcement={announcement}>
            <AuthProvider>{children}</AuthProvider>
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
