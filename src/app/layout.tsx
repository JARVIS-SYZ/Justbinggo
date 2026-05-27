import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BINGO SYSTEM',
  description: '실시간 빙고 게임 시스템',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        <div className="page-wrapper">{children}</div>
      </body>
    </html>
  );
}
