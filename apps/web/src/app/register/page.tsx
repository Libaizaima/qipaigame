'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPwd) {
      setError('两次密码输入不一致');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    try {
      await register(username, password, email || undefined);
      router.push('/login?registered=1');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card glass-card animate-slide-up">
        <div className="auth-header">
          <div className="auth-icon">🎲</div>
          <h1>创建账号</h1>
          <p>注册即送 10,000 筹码</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {error && <div className="auth-error">{error}</div>}

          <div className="input-group">
            <label htmlFor="username">用户名</label>
            <input id="username" type="text" className="input" placeholder="3-20个字符" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </div>

          <div className="input-group">
            <label htmlFor="email">邮箱（可选）</label>
            <input id="email" type="email" className="input" placeholder="your@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>

          <div className="input-group">
            <label htmlFor="password">密码</label>
            <input id="password" type="password" className="input" placeholder="至少6位" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <div className="input-group">
            <label htmlFor="confirm-password">确认密码</label>
            <input id="confirm-password" type="password" className="input" placeholder="再次输入密码" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="btn-submit-register">
            {loading ? <span className="spinner" /> : '注 册'}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？<Link href="/login">去登录</Link>
        </div>
      </div>

      <style jsx>{`
        .auth-page {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: calc(100vh - var(--header-height));
          padding: 24px;
        }
        .auth-card {
          width: 100%;
          max-width: 420px;
          padding: 40px 36px;
        }
        .auth-header {
          text-align: center;
          margin-bottom: 32px;
        }
        .auth-icon { font-size: 3rem; margin-bottom: 12px; }
        .auth-header h1 {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 700;
          margin-bottom: 4px;
        }
        .auth-header p {
          color: var(--accent-gold);
          font-size: 0.9rem;
          font-weight: 500;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .auth-error {
          padding: 12px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm);
          color: var(--accent-red);
          font-size: 0.85rem;
          text-align: center;
        }
        .auth-footer {
          text-align: center;
          margin-top: 24px;
          font-size: 0.9rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
