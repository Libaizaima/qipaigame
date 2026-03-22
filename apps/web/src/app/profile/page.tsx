'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const { user, balance, logout } = useAuth();
  const router = useRouter();

  if (!user) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>请先登录</p>
      </div>
    );
  }

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="profile-page container">
      <div className="page-header animate-fade-in">
        <h1>👤 个人中心</h1>
      </div>

      <div className="profile-card glass-card animate-slide-up">
        <div className="profile-avatar">
          {user.username[0].toUpperCase()}
        </div>
        <div className="profile-info">
          <h2>{user.username}</h2>
          <span className={`badge ${user.role === 'ADMIN' ? 'badge-red' : 'badge-blue'}`}>
            {user.role === 'ADMIN' ? '管理员' : '玩家'}
          </span>
        </div>
      </div>

      <div className="stats-grid animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="stat-card glass-card">
          <span className="stat-icon">💰</span>
          <span className="stat-val">{balance.toLocaleString()}</span>
          <span className="stat-name">可用余额</span>
        </div>
        <div className="stat-card glass-card">
          <span className="stat-icon">🆔</span>
          <span className="stat-val" style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{user.id}</span>
          <span className="stat-name">用户 ID</span>
        </div>
      </div>

      <div className="actions animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <button className="btn btn-danger btn-full" onClick={handleLogout} id="btn-logout">
          🚪 退出登录
        </button>
      </div>

      <style jsx>{`
        .profile-page { padding-bottom: 40px; max-width: 600px; margin: 0 auto; }
        .profile-card {
          display: flex; align-items: center; gap: 20px;
          padding: 32px; margin-bottom: 24px;
        }
        .profile-avatar {
          width: 72px; height: 72px; border-radius: 50%;
          background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim));
          display: flex; align-items: center; justify-content: center;
          color: #0a0e17; font-size: 1.8rem; font-weight: 800; flex-shrink: 0;
        }
        .profile-info h2 {
          font-family: var(--font-display); font-size: 1.4rem;
          font-weight: 700; margin-bottom: 6px;
        }
        .stats-grid {
          display: grid; grid-template-columns: repeat(2, 1fr);
          gap: 16px; margin-bottom: 32px;
        }
        .stat-card {
          padding: 24px; text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .stat-icon { font-size: 1.5rem; }
        .stat-val {
          font-family: var(--font-display); font-size: 1.4rem;
          font-weight: 700; color: var(--accent-gold);
        }
        .stat-name { font-size: 0.8rem; color: var(--text-muted); }
        .actions { max-width: 300px; margin: 0 auto; }
      `}</style>
    </div>
  );
}
