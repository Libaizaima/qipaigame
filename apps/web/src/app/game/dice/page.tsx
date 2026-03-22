'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { betApi } from '@/lib/api';
import { getSocket } from '@/lib/socket';

interface RoundState {
  roundId: string;
  roundNo: number;
  status: string;
  countdown: number;
  result?: {
    dice: [number, number, number];
    total: number;
    isBig: boolean;
    isSmall: boolean;
    isOdd: boolean;
    isEven: boolean;
    isTriple: boolean;
  };
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const BET_TYPES = [
  { key: 'big', label: '大', desc: '11-17', odds: '1:1', color: '#ef4444' },
  { key: 'small', label: '小', desc: '4-10', odds: '1:1', color: '#3b82f6' },
  { key: 'odd', label: '单', desc: '奇数', odds: '1:1', color: '#a855f7' },
  { key: 'even', label: '双', desc: '偶数', odds: '1:1', color: '#22c55e' },
];

const TOTAL_BETS = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

const TOTAL_ODDS: Record<number, number> = {
  4: 60, 5: 30, 6: 17, 7: 12, 8: 8, 9: 6, 10: 6,
  11: 6, 12: 6, 13: 8, 14: 12, 15: 17, 16: 30, 17: 60,
};

const CHIPS = [10, 50, 100, 500, 1000];

export default function DicePage() {
  const { user, token, balance, refreshBalance, updateBalance } = useAuth();
  const [round, setRound] = useState<RoundState>({ roundId: '', roundNo: 0, status: 'waiting', countdown: 0 });
  const [selectedChip, setSelectedChip] = useState(10);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [placing, setPlacing] = useState(false);
  const [rolling, setRolling] = useState(false);

  useEffect(() => {
    const socket = getSocket(token || undefined);
    socket.emit('join_room', { roomId: 'dice-room' });

    socket.on('round_start', (data: any) => {
      setRound({ roundId: data.roundId, roundNo: data.roundNo, status: 'betting', countdown: data.bettingSeconds });
      setBets({});
      setMessage('');
      setRolling(false);
    });

    socket.on('countdown_update', (data: any) => {
      setRound((r) => ({ ...r, countdown: data.remaining }));
    });

    socket.on('round_closed', () => {
      setRound((r) => ({ ...r, status: 'closed', countdown: 0 }));
      setRolling(true);
      setTimeout(() => setRolling(false), 2000);
    });

    socket.on('round_result', (data: any) => {
      setRound((r) => ({ ...r, status: 'result', result: data.result }));
      setRecentResults((prev) => [data.result, ...prev].slice(0, 30));
      setRolling(false);
    });

    socket.on('wallet_updated', (data: any) => {
      refreshBalance();
      if (data.type === 'win') setMessage(`🎉 恭喜中奖！ +${data.amount}`);
    });

    return () => {
      socket.emit('leave_room', { roomId: 'dice-room' });
      socket.off('round_start');
      socket.off('countdown_update');
      socket.off('round_closed');
      socket.off('round_result');
      socket.off('wallet_updated');
    };
  }, [token, refreshBalance]);

  const placeBet = useCallback(async (betType: string) => {
    if (!token || !user) { setMessage('请先登录'); return; }
    if (round.status !== 'betting') { setMessage('当前不在下注时间'); return; }
    if (selectedChip > balance) { setMessage('余额不足'); return; }

    setPlacing(true);
    try {
      const res = await betApi.placeBet(token, { roomId: round.roundId, betType, betAmount: selectedChip });
      setBets((prev) => ({ ...prev, [betType]: (prev[betType] || 0) + selectedChip }));
      updateBalance(res.remainingBalance);
    } catch (err: any) {
      setMessage(err.message || '下注失败');
    } finally {
      setPlacing(false);
    }
  }, [token, user, round.status, round.roundId, selectedChip, balance, updateBalance]);

  return (
    <div className="game-page container">
      {/* Header */}
      <div className="game-header animate-fade-in">
        <div className="game-title-row">
          <h1>🎲 骰宝</h1>
          <div className="round-info">
            <span className="round-no">第 {round.roundNo} 局</span>
            <span className={`round-status status-${round.status}`}>
              {round.status === 'waiting' && '等待中'}
              {round.status === 'betting' && `下注中 ${round.countdown}s`}
              {round.status === 'closed' && '开奖中...'}
              {round.status === 'result' && '已开奖'}
            </span>
          </div>
        </div>
        {round.status === 'betting' && (
          <div className="countdown-bar">
            <div className="countdown-progress" style={{ width: `${(round.countdown / 15) * 100}%` }} />
          </div>
        )}
      </div>

      {message && <div className="game-message animate-fade-in">{message}</div>}

      {/* Dice Display */}
      <div className="dice-area glass-card animate-slide-up">
        <div className="dice-display">
          {round.result ? (
            <>
              {round.result.dice.map((d, i) => (
                <div key={i} className={`dice ${rolling ? 'rolling' : ''}`} style={{ animationDelay: `${i * 0.1}s` }}>
                  {DICE_FACES[d - 1]}
                </div>
              ))}
            </>
          ) : (
            [0, 1, 2].map((i) => (
              <div key={i} className={`dice ${rolling ? 'rolling' : ''}`}>?</div>
            ))
          )}
        </div>

        {round.result && (
          <div className="dice-result">
            <span className="dice-total">总和: {round.result.total}</span>
            <div className="dice-tags">
              <span className={`badge ${round.result.isBig ? 'badge-red' : 'badge-blue'}`}>
                {round.result.isBig ? '大' : round.result.isSmall ? '小' : '三同'}
              </span>
              <span className={`badge ${round.result.isOdd ? 'badge-gold' : 'badge-green'}`}>
                {round.result.isOdd ? '单' : '双'}
              </span>
              {round.result.isTriple && <span className="badge badge-red">三同通杀!</span>}
            </div>
          </div>
        )}
      </div>

      {/* Bet Zones - Main */}
      <div className="bet-area animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="bet-zones-main">
          {BET_TYPES.map((bt) => (
            <button
              key={bt.key}
              className="bet-zone-main"
              style={{ borderColor: bt.color }}
              onClick={() => placeBet(bt.key)}
              disabled={round.status !== 'betting' || placing}
              id={`bet-${bt.key}`}
            >
              <span className="bet-label" style={{ color: bt.color }}>{bt.label}</span>
              <span className="bet-desc">{bt.desc}</span>
              <span className="bet-odds">{bt.odds}</span>
              {bets[bt.key] && <span className="bet-placed">{bets[bt.key]}</span>}
            </button>
          ))}
        </div>

        {/* Bet Zones - Total */}
        <div className="bet-zones-total">
          <h4>指定总和</h4>
          <div className="total-grid">
            {TOTAL_BETS.map((n) => (
              <button
                key={n}
                className="total-btn"
                onClick={() => placeBet(`total_${n}`)}
                disabled={round.status !== 'betting' || placing}
                id={`bet-total-${n}`}
              >
                <span className="total-num">{n}</span>
                <span className="total-odds">1:{TOTAL_ODDS[n]}</span>
                {bets[`total_${n}`] && <span className="bet-placed">{bets[`total_${n}`]}</span>}
              </button>
            ))}
          </div>
        </div>

        <div className="chip-selection">
          <span className="chip-label">筹码</span>
          <div className="chip-stack">
            {CHIPS.map((c) => (
              <button key={c} className={`chip chip-${c} ${selectedChip === c ? 'selected' : ''}`} onClick={() => setSelectedChip(c)}>
                {c >= 1000 ? `${c / 1000}K` : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Results */}
      <div className="road-section glass-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3>最近开奖</h3>
        <div className="results-list">
          {recentResults.slice(0, 10).map((r, i) => (
            <div key={i} className="result-row">
              <div className="result-dice">
                {r.dice.map((d: number, j: number) => <span key={j} className="mini-dice">{DICE_FACES[d - 1]}</span>)}
              </div>
              <span className="result-total">= {r.total}</span>
              <span className={`badge ${r.isBig ? 'badge-red' : 'badge-blue'}`}>{r.isBig ? '大' : r.isSmall ? '小' : '三同'}</span>
            </div>
          ))}
          {recentResults.length === 0 && <p className="empty-text">暂无记录</p>}
        </div>
      </div>

      <style jsx>{`
        .game-page { padding-bottom: 40px; }
        .game-header { padding: 20px 0; }
        .game-title-row { display: flex; align-items: center; justify-content: space-between; }
        .game-title-row h1 { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; }
        .round-info { display: flex; align-items: center; gap: 12px; }
        .round-no { font-size: 0.9rem; color: var(--text-secondary); }
        .round-status { padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
        .status-betting { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); }
        .status-closed, .status-waiting { background: rgba(100, 116, 139, 0.15); color: var(--text-muted); }
        .status-result { background: rgba(245, 200, 66, 0.15); color: var(--accent-gold); }
        .countdown-bar { height: 4px; background: var(--bg-secondary); border-radius: 2px; margin-top: 12px; overflow: hidden; }
        .countdown-progress { height: 100%; background: linear-gradient(90deg, var(--accent-green), var(--accent-gold)); transition: width 1s linear; }
        .game-message { padding: 10px 16px; background: rgba(245, 200, 66, 0.1); border: 1px solid rgba(245, 200, 66, 0.2); border-radius: var(--radius-sm); color: var(--accent-gold); font-size: 0.9rem; text-align: center; margin-bottom: 16px; }

        .dice-area { padding: 32px; text-align: center; margin-bottom: 24px; }
        .dice-display { display: flex; justify-content: center; gap: 16px; margin-bottom: 20px; }
        .dice-result { display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .dice-total { font-family: var(--font-display); font-size: 1.5rem; font-weight: 700; color: var(--accent-gold); }
        .dice-tags { display: flex; gap: 8px; }

        .bet-area { margin-bottom: 24px; }
        .bet-zones-main { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
        .bet-zone-main {
          padding: 20px 12px; background: var(--bg-card); border: 2px solid; border-radius: var(--radius-md);
          cursor: pointer; text-align: center; transition: all 0.2s; position: relative;
        }
        .bet-zone-main:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3); }
        .bet-zone-main:disabled { opacity: 0.5; cursor: not-allowed; }
        .bet-label { display: block; font-size: 1.5rem; font-weight: 800; font-family: var(--font-display); }
        .bet-desc { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 2px; }
        .bet-odds { display: block; font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px; }
        .bet-placed {
          position: absolute; top: -8px; right: -8px; background: var(--accent-gold); color: #0a0e17;
          padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;
        }

        .bet-zones-total { margin-bottom: 20px; }
        .bet-zones-total h4 { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px; font-weight: 600; }
        .total-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
        .total-btn {
          padding: 12px 4px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-sm);
          cursor: pointer; text-align: center; transition: all 0.2s; position: relative; color: var(--text-primary);
        }
        .total-btn:hover:not(:disabled) { border-color: var(--accent-gold); background: var(--bg-card-hover); }
        .total-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .total-num { display: block; font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; }
        .total-odds { display: block; font-size: 0.65rem; color: var(--text-muted); }

        .chip-selection { display: flex; align-items: center; gap: 16px; }
        .chip-label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }

        .road-section { padding: 20px; }
        .road-section h3 { font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary); }
        .results-list { display: flex; flex-direction: column; gap: 8px; }
        .result-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border-color); }
        .result-dice { display: flex; gap: 4px; }
        .mini-dice { font-size: 1.2rem; }
        .result-total { font-weight: 600; color: var(--accent-gold); min-width: 50px; }
        .empty-text { color: var(--text-muted); font-size: 0.85rem; }

        @media (max-width: 768px) {
          .bet-zones-main { grid-template-columns: repeat(2, 1fr); }
          .total-grid { grid-template-columns: repeat(4, 1fr); }
          .chip-selection { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
