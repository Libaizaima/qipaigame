'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { adminApi } from '@/lib/api';

interface UserItem {
  id: string;
  username: string;
  email: string | null;
  role: string;
  status: string;
  createdAt: string;
  wallet: { balance: number } | null;
}

export default function AdminPage() {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  // Adjust modal
  const [adjustTarget, setAdjustTarget] = useState<UserItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await adminApi.getUsers(token, page);
      setUsers(res.items);
      setTotal(res.total);
    } catch (err: any) {
      setMessage(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleAdjust = async () => {
    if (!token || !adjustTarget) return;
    const amount = parseFloat(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      setMessage('请输入有效的调整金额');
      return;
    }
    if (!adjustReason.trim()) {
      setMessage('请填写调整原因');
      return;
    }
    setAdjusting(true);
    try {
      const res = await adminApi.adjustBalance(token, adjustTarget.id, {
        amount,
        reason: adjustReason.trim(),
      });
      setMessage(`✅ ${adjustTarget.username} 余额已调整: ${res.beforeBalance} → ${res.afterBalance}`);
      setAdjustTarget(null);
      setAdjustAmount('');
      setAdjustReason('');
      loadUsers();
    } catch (err: any) {
      setMessage(err.message || '调整失败');
    } finally {
      setAdjusting(false);
    }
  };

  const handleToggleStatus = async (u: UserItem) => {
    if (!token) return;
    try {
      if (u.status === 'ACTIVE') {
        await adminApi.banUser(token, u.id);
        setMessage(`${u.username} 已封禁`);
      } else {
        await adminApi.activateUser(token, u.id);
        setMessage(`${u.username} 已解封`);
      }
      loadUsers();
    } catch (err: any) {
      setMessage(err.message || '操作失败');
    }
  };

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--text-muted)' }}>⛔ 无权访问</h2>
        <p style={{ color: 'var(--text-secondary)' }}>此页面仅管理员可访问</p>
      </div>
    );
  }

  return (
    <div className="admin-page container">
      <div className="admin-header animate-fade-in">
        <h1>⚙️ 管理后台</h1>
        <span className="admin-badge">ADMIN</span>
      </div>

      {message && (
        <div className="admin-message animate-fade-in">{message}
          <button className="msg-close" onClick={() => setMessage('')}>×</button>
        </div>
      )}

      <div className="admin-card glass-card animate-slide-up">
        <div className="card-header">
          <h2>用户管理</h2>
          <span className="total-badge">共 {total} 人</span>
        </div>

        {loading ? (
          <div className="loading-text">加载中...</div>
        ) : (
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>用户名</th>
                  <th>角色</th>
                  <th>状态</th>
                  <th>余额</th>
                  <th>注册时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="td-username">{u.username}</td>
                    <td><span className={`role-tag role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                    <td><span className={`status-tag status-${u.status.toLowerCase()}`}>{u.status === 'ACTIVE' ? '正常' : '封禁'}</span></td>
                    <td className="td-balance">{Number(u.wallet?.balance ?? 0).toLocaleString()}</td>
                    <td className="td-date">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="td-actions">
                      <button
                        className="btn-action btn-adjust"
                        onClick={() => { setAdjustTarget(u); setAdjustAmount(''); setAdjustReason(''); }}
                        id={`adjust-${u.id}`}
                      >
                        💰 调整积分
                      </button>
                      {u.role !== 'ADMIN' && (
                        <button
                          className={`btn-action ${u.status === 'ACTIVE' ? 'btn-ban' : 'btn-unban'}`}
                          onClick={() => handleToggleStatus(u)}
                          id={`toggle-${u.id}`}
                        >
                          {u.status === 'ACTIVE' ? '🚫 封禁' : '✅ 解封'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {total > 20 && (
          <div className="pagination">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}>上一页</button>
            <span>第 {page} 页</span>
            <button disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>下一页</button>
          </div>
        )}
      </div>

      {/* Adjust Balance Modal */}
      {adjustTarget && (
        <div className="modal-overlay" onClick={() => setAdjustTarget(null)}>
          <div className="modal-content glass-card animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <h3>调整积分 — {adjustTarget.username}</h3>
            <p className="current-balance">
              当前余额: <strong>{Number(adjustTarget.wallet?.balance ?? 0).toLocaleString()}</strong>
            </p>
            <div className="form-group">
              <label>调整金额</label>
              <input
                type="number"
                placeholder="正数增加，负数减少"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)}
                id="adjust-amount-input"
              />
            </div>
            <div className="form-group">
              <label>原因</label>
              <input
                type="text"
                placeholder="如：充值、奖励、扣除..."
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                id="adjust-reason-input"
              />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setAdjustTarget(null)}>取消</button>
              <button className="btn-confirm" onClick={handleAdjust} disabled={adjusting} id="confirm-adjust-btn">
                {adjusting ? '处理中...' : '确认调整'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .admin-page { padding-bottom: 60px; }
        .admin-header {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 28px 0 20px;
        }
        .admin-header h1 {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 700;
        }
        .admin-badge {
          padding: 4px 14px;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 700;
          background: rgba(245, 200, 66, 0.15);
          color: var(--accent-gold);
          letter-spacing: 0.1em;
        }
        .admin-message {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 16px;
          background: rgba(245, 200, 66, 0.1);
          border: 1px solid rgba(245, 200, 66, 0.2);
          border-radius: var(--radius-sm);
          color: var(--accent-gold);
          font-size: 0.9rem;
          margin-bottom: 16px;
        }
        .msg-close {
          background: none;
          border: none;
          color: var(--accent-gold);
          font-size: 1.2rem;
          cursor: pointer;
          padding: 0 4px;
        }
        .admin-card { padding: 24px; margin-bottom: 24px; }
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .card-header h2 {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 600;
        }
        .total-badge {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .loading-text {
          text-align: center;
          color: var(--text-muted);
          padding: 40px 0;
        }
        .table-wrap { overflow-x: auto; }
        .admin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        .admin-table th {
          text-align: left;
          padding: 10px 12px;
          font-weight: 600;
          color: var(--text-secondary);
          border-bottom: 1px solid var(--border-color);
          white-space: nowrap;
        }
        .admin-table td {
          padding: 12px;
          border-bottom: 1px solid rgba(255,255,255,0.04);
          vertical-align: middle;
        }
        .td-username { font-weight: 600; }
        .td-balance {
          font-family: var(--font-display);
          font-weight: 700;
          color: var(--accent-gold);
        }
        .td-date { color: var(--text-muted); font-size: 0.82rem; }
        .td-actions { white-space: nowrap; }
        .role-tag {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 600;
        }
        .role-admin { background: rgba(245, 200, 66, 0.15); color: var(--accent-gold); }
        .role-player { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
        .status-tag {
          padding: 2px 8px;
          border-radius: 10px;
          font-size: 0.72rem;
          font-weight: 600;
        }
        .status-active { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); }
        .status-banned { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
        .btn-action {
          padding: 5px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.78rem;
          cursor: pointer;
          transition: all 0.2s;
          margin-right: 6px;
        }
        .btn-action:hover { background: var(--bg-card); transform: translateY(-1px); }
        .btn-ban:hover { border-color: #ef4444; color: #ef4444; }
        .btn-unban:hover { border-color: var(--accent-green); color: var(--accent-green); }
        .btn-adjust:hover { border-color: var(--accent-gold); color: var(--accent-gold); }
        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          margin-top: 20px;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .pagination button {
          padding: 6px 16px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          cursor: pointer;
        }
        .pagination button:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Modal */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          width: 420px;
          max-width: 90vw;
          padding: 28px;
        }
        .modal-content h3 {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .current-balance {
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin-bottom: 20px;
        }
        .current-balance strong { color: var(--accent-gold); }
        .form-group { margin-bottom: 16px; }
        .form-group label {
          display: block;
          font-size: 0.82rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .form-group input {
          width: 100%;
          padding: 10px 14px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 0.9rem;
          outline: none;
          transition: border-color 0.2s;
        }
        .form-group input:focus { border-color: var(--accent-gold); }
        .modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          margin-top: 24px;
        }
        .btn-cancel {
          padding: 8px 20px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border-color);
          background: transparent;
          color: var(--text-secondary);
          cursor: pointer;
          font-size: 0.88rem;
        }
        .btn-confirm {
          padding: 8px 24px;
          border-radius: var(--radius-sm);
          border: none;
          background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim));
          color: #0a0e17;
          font-weight: 700;
          cursor: pointer;
          font-size: 0.88rem;
          transition: opacity 0.2s;
        }
        .btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-confirm:hover:not(:disabled) { opacity: 0.9; }

        @media (max-width: 768px) {
          .admin-table { font-size: 0.78rem; }
          .admin-table th, .admin-table td { padding: 8px 6px; }
          .btn-action { padding: 4px 8px; font-size: 0.72rem; }
        }
      `}</style>
    </div>
  );
}
