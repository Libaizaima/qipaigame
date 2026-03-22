'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { betApi } from '@/lib/api';

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  PENDING: { label: '待结算', className: 'badge-gold' },
  WON: { label: '已中奖', className: 'badge-green' },
  LOST: { label: '未中奖', className: 'badge-red' },
  REFUNDED: { label: '已退款', className: 'badge-blue' },
};

const BET_TYPE_NAMES: Record<string, string> = {
  player: '闲', banker: '庄', tie: '和', player_pair: '闲对', banker_pair: '庄对',
  big: '大', small: '小', odd: '单', even: '双',
  total_4: '总和4', total_5: '总和5', total_6: '总和6', total_7: '总和7',
  total_8: '总和8', total_9: '总和9', total_10: '总和10', total_11: '总和11',
  total_12: '总和12', total_13: '总和13', total_14: '总和14', total_15: '总和15',
  total_16: '总和16', total_17: '总和17',
};

export default function HistoryPage() {
  const { token, user } = useAuth();
  const [bets, setBets] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    loadBets();
  }, [token, page]);

  const loadBets = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await betApi.getMyBets(token, page);
      setBets(data.items);
      setTotalPages(data.totalPages);
    } catch {}
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: '60px 0', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>请先登录查看记录</p>
      </div>
    );
  }

  return (
    <div className="history-page container">
      <div className="page-header animate-fade-in">
        <h1>📋 下注记录</h1>
        <p>查看你的所有下注历史</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}><div className="spinner spinner-lg" /></div>
      ) : bets.length === 0 ? (
        <div className="empty-state glass-card">
          <span className="empty-icon">🎯</span>
          <p>还没有下注记录</p>
          <p className="empty-hint">去游戏大厅开始你的第一局吧！</p>
        </div>
      ) : (
        <>
          <div className="table-wrapper animate-slide-up">
            <table>
              <thead>
                <tr>
                  <th>游戏</th>
                  <th>局号</th>
                  <th>玩法</th>
                  <th>下注金额</th>
                  <th>赔率</th>
                  <th>派奖</th>
                  <th>状态</th>
                  <th>时间</th>
                </tr>
              </thead>
              <tbody>
                {bets.map((bet: any) => {
                  const status = STATUS_MAP[bet.status] || { label: bet.status, className: '' };
                  return (
                    <tr key={bet.id}>
                      <td><span className="badge badge-gold">{bet.game?.name || bet.gameId}</span></td>
                      <td>#{bet.round?.roundNo || '-'}</td>
                      <td style={{ fontWeight: 600 }}>{BET_TYPE_NAMES[bet.betType] || bet.betType}</td>
                      <td>{Number(bet.betAmount).toLocaleString()}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>1:{Number(bet.odds)}</td>
                      <td style={{ color: bet.payoutAmount > 0 ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: 600 }}>
                        {bet.payoutAmount ? `+${Number(bet.payoutAmount).toLocaleString()}` : '-'}
                      </td>
                      <td><span className={`badge ${status.className}`}>{status.label}</span></td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{new Date(bet.createdAt).toLocaleString('zh-CN')}</td>
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

      <style jsx>{`
        .history-page { padding-bottom: 40px; }
        .empty-state { text-align: center; padding: 60px 24px; }
        .empty-icon { font-size: 3rem; display: block; margin-bottom: 16px; }
        .empty-state p { font-size: 1rem; color: var(--text-secondary); }
        .empty-hint { font-size: 0.85rem; color: var(--text-muted); margin-top: 8px; }
        .pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; }
        .page-info { font-size: 0.85rem; color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
