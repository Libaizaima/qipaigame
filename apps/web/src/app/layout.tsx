import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/Header';

export const metadata: Metadata = {
  title: 'AM-GAME | 棋牌游戏平台',
  description: '在线棋牌游戏平台 - 百家乐、骰子',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <AuthProvider>
          <Header />
          <main style={{ position: 'relative', zIndex: 1, minHeight: 'calc(100vh - 64px)' }}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
