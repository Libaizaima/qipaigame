'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Header() {
  const { user, balance, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const navLinks = [
    { href: '/', label: '🏠 大厅', id: 'nav-lobby' },
    { href: '/history', label: '📋 记录', id: 'nav-history' },
    { href: '/wallet', label: '💰 钱包', id: 'nav-wallet' },
  ];

  return (
    <header className="header">
      <div className="header-inner container">
        <Link href="/" className="header-logo" id="logo">
          <span className="logo-icon">🎰</span>
          <span className="logo-text">AM-GAME</span>
        </Link>

        <nav className="header-nav">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              id={link.id}
              className={`nav-link ${pathname === link.href ? 'active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="header-actions">
          {user ? (
            <>
              <div className="balance-display" id="balance-display">
                <span className="balance-label">余额</span>
                <span className="balance-amount">{balance.toLocaleString()}</span>
              </div>
              <div className="user-menu" onClick={() => setMenuOpen(!menuOpen)}>
                <div className="avatar" id="avatar">{user.username[0].toUpperCase()}</div>
                <span className="username">{user.username}</span>
                {menuOpen && (
                  <div className="dropdown animate-fade-in">
                    <Link href="/profile" className="dropdown-item" id="menu-profile">
                      👤 个人中心
                    </Link>
                    {user.role === 'ADMIN' && (
                      <Link href="/admin" className="dropdown-item" id="menu-admin">
                        ⚙️ 管理后台
                      </Link>
                    )}
                    <button className="dropdown-item" onClick={handleLogout} id="menu-logout">
                      🚪 退出登录
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="auth-buttons">
              <Link href="/login" className="btn btn-secondary btn-sm" id="btn-login">登录</Link>
              <Link href="/register" className="btn btn-primary btn-sm" id="btn-register">注册</Link>
            </div>
          )}
        </div>

        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>☰</button>
      </div>

      <style jsx>{`
        .header {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(10, 14, 23, 0.9);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border-color);
          height: var(--header-height);
        }
        .header-inner {
          display: flex;
          align-items: center;
          height: 100%;
          gap: 32px;
        }
        .header-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .logo-icon { font-size: 1.6rem; }
        .logo-text {
          font-family: var(--font-display);
          font-size: 1.3rem;
          font-weight: 800;
          background: linear-gradient(135deg, var(--accent-gold), #ffd700);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          letter-spacing: 0.05em;
        }
        .header-nav {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }
        .nav-link {
          padding: 8px 16px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.2s;
          text-decoration: none;
        }
        .nav-link:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.05);
        }
        .nav-link.active {
          color: var(--accent-gold);
          background: rgba(245, 200, 66, 0.1);
        }
        .header-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-shrink: 0;
        }
        .balance-display {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          padding: 6px 14px;
          background: rgba(245, 200, 66, 0.08);
          border-radius: var(--radius-sm);
          border: 1px solid rgba(245, 200, 66, 0.15);
        }
        .balance-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .balance-amount {
          font-size: 1rem;
          font-weight: 700;
          color: var(--accent-gold);
          font-family: var(--font-display);
        }
        .user-menu {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          padding: 6px;
          border-radius: var(--radius-sm);
          transition: background 0.2s;
        }
        .user-menu:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #0a0e17;
          font-weight: 700;
          font-size: 0.85rem;
        }
        .username {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--text-primary);
        }
        .dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 8px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-md);
          min-width: 180px;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
        }
        .dropdown-item {
          display: block;
          padding: 12px 16px;
          font-size: 0.9rem;
          color: var(--text-primary);
          text-decoration: none;
          transition: background 0.15s;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          font-family: var(--font-primary);
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
        }
        .auth-buttons {
          display: flex;
          gap: 8px;
        }
        .mobile-menu-btn {
          display: none;
          background: none;
          border: none;
          color: var(--text-primary);
          font-size: 1.5rem;
          cursor: pointer;
        }
        @media (max-width: 768px) {
          .header-nav { display: none; }
          .username { display: none; }
          .mobile-menu-btn { display: block; }
        }
      `}</style>
    </header>
  );
}
