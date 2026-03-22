'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { walletApi } from '@/lib/api';

const TX_TYPE_MAP: Record<string, { label: string; color: string }> = {
  BET_PLACE: { label: '下注', color: 'var(--accent-red)' },
  BET_WIN: { label: '中奖', color: 'var(--accent-green)' },
  BET_REFUND: { label: '退款', color: 'var(--accent-blue)' },
  BONUS: { label: '赠送', color: 'var(--accent-gold)' },
  ADMIN_ADJUST: { label: '调整', color: 'var(--accent-purple)' },
};

export default function WalletPage() {
  const { user, token, balance, refreshBalance } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    loadTransactions();
  }, [token, page]);

  const loadTransactions = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await walletApi.getTransactions(token, page);
      setTransactions(data.items);
      setTotalPages(data.totalPages);
    } catch {}
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>请先登录</p>
      </div>
    );
  }

  return (
    <div className="wallet-page container">
      <div className="page-header animate-fade-in">
        <h1>💰 钱包</h1>
        <p>查看余额和账变流水</p>
      </div>

      <div className="balance-card glass-card animate-slide-up">
        <div className="balance-inner">
          <span className="balance-title">可用余额</span>
          <span className="balance-value">{balance.toLocaleString()}</span>
          <button className="btn btn-secondary btn-sm" onClick={refreshBalance}>刷新</button>
        </div>
      </div>

      <div className="tx-section animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <h2>账变流水</h2>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner spinner-lg" /></div>
        ) : transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>暂无记录</div>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>类型</th>
                    <th>金额</th>
                    <th>变动前</th>
                    <th>变动后</th>
                    <th>时间</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx: any) => {
                    const info = TX_TYPE_MAP[tx.type] || { label: tx.type, color: 'var(--text-secondary)' };
                    const amount = Number(tx.amount);
                    return (
                      <tr key={tx.id}>
                        <td><span className="badge" style={{ background: `${info.color}22`, color: info.color }}>{info.label}</span></td>
                        <td style={{ color: amount >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                          {amount >= 0 ? '+' : ''}{amount.toLocaleString()}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{Number(tx.beforeBalance).toLocaleString()}</td>
                        <td style={{ fontWeight: 600 }}>{Number(tx.afterBalance).toLocaleString()}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{new Date(tx.createdAt).toLocaleString('zh-CN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
              <span className="page-info">{page} / {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>下一页</button>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        .wallet-page { padding-bottom: 40px; }
        .balance-card { padding: 32px; margin-bottom: 32px; }
        .balance-inner { display: flex; align-items: center; gap: 24px; }
        .balance-title { font-size: 0.9rem; color: var(--text-secondary); }
        .balance-value {
          font-family: var(--font-display);
          font-size: 2.5rem; font-weight: 800;
          background: linear-gradient(135deg, var(--accent-gold), #ffd700);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        .tx-section h2 { font-size: 1.1rem; font-weight: 600; margin-bottom: 16px; }
        .pagination {
          display: flex; align-items: center; justify-content: center;
          gap: 16px; margin-top: 20px;
        }
        .page-info { font-size: 0.85rem; color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
