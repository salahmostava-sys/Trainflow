import './globals.css';
import Script from 'next/script';
import { languageBootstrap } from '@/generated/workspace-assets';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" id="html-root" suppressHydrationWarning>
      <head>
        <title id="doc-title">TrainFlow</title>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        <Script id="trainflow-initial-language" strategy="beforeInteractive">{languageBootstrap}</Script>
        <link rel="stylesheet" href="/workspace/workspace.css" />
        <link rel="stylesheet" href="/workspace/trainees.css" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
