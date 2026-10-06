import './globals.css';
import Script from 'next/script';
import ClassicWorkspace from '@/components/ClassicWorkspace';
import { classicLinks, classicStyles, languageBootstrap } from '@/generated/classic-ui';

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
        {classicLinks.map((attributes, index) => <link key={index} {...attributes} />)}
        <style id="trainflow-classic-styles" dangerouslySetInnerHTML={{ __html: classicStyles }} />
      </head>
      <body>
        <ClassicWorkspace />
        {children}
      </body>
    </html>
  );
}
