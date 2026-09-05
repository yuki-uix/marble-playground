import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Marble Lab · 弹珠工坊',
  icons: { icon: '/favicon.svg' },
  description:
    '搭一条小路，让弹珠回家。一个可以摆放、旋转、反复试玩的 Three.js 弹珠游乐场。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
