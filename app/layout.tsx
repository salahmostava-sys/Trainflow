import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TrainFlow | منصة إدارة الأكواد والتسجيل الذكية',
  description: 'منصة SaaS سحابية متكاملة لإدارة مفاتيح الأكواد، فحص الأرصدة، شيت المتدربين، ومزامنة بيانات بروميترك.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main>{children}</main>
      </body>
    </html>
  );
}
