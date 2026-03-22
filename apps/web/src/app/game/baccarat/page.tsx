'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { betApi } from '@/lib/api';
import { getSocket, disconnectSocket } from '@/lib/socket';

interface Card { suit: string; rank: string; value: number; }
interface RoundState {
  roundId: string;
  roundNo: number;
  status: string;
  countdown: number;
  result?: {
    playerCards: Card[];
    bankerCards: Card[];
    playerTotal: number;
    bankerTotal: number;
    winner: string;
    playerPair: boolean;
    bankerPair: boolean;
  };
}

const BET_TYPES = [
  { key: 'player', label: '闲', odds: '1:1', color: '#3b82f6' },
  { key: 'banker', label: '庄', odds: '1:0.95', color: '#ef4444' },
  { key: 'tie', label: '和', odds: '1:8', color: '#22c55e' },
  { key: 'player_pair', label: '闲对', odds: '1:11', color: '#60a5fa' },
  { key: 'banker_pair', label: '庄对', odds: '1:11', color: '#f87171' },
];

const CHIPS = [10, 50, 100, 500, 1000];

export default function BaccaratPage() {
  const { user, token, balance, refreshBalance, updateBalance } = useAuth();
  const [round, setRound] = useState<RoundState>({ roundId: '', roundNo: 0, status: 'waiting', countdown: 0 });
  const [selectedChip, setSelectedChip] = useState(10);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [recentResults, setRecentResults] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [placing, setPlacing] = useState(false);
  const socketRef = useRef<any>(null);

  // WebSocket 连接
  useEffect(() => {
    const socket = getSocket(token || undefined);
    socketRef.current = socket;

    socket.emit('join_room', { roomId: 'baccarat-room' });

    socket.on('round_start', (data: any) => {
      setRound({ roundId: data.roundId, roundNo: data.roundNo, status: 'betting', countdown: data.bettingSeconds });
      setBets({});
      setMessage('');
    });

    socket.on('countdown_update', (data: any) => {
      setRound((r) => ({ ...r, countdown: data.remaining }));
    });

    socket.on('round_closed', () => {
      setRound((r) => ({ ...r, status: 'closed', countdown: 0 }));
    });

    socket.on('round_result', (data: any) => {
      setRound((r) => ({ ...r, status: 'result', result: data.result }));
      setRecentResults((prev) => [data.result, ...prev].slice(0, 20));
    });

    socket.on('wallet_updated', (data: any) => {
      refreshBalance();
      if (data.type === 'win') setMessage(`🎉 恭喜中奖！ +${data.amount}`);
      else if (data.type === 'refund') setMessage(`↩️ 和局退还本金`);
    });

    return () => {
      socket.emit('leave_room', { roomId: 'baccarat-room' });
      socket.off('round_start');
      socket.off('countdown_update');
      socket.off('round_closed');
      socket.off('round_result');
      socket.off('wallet_updated');
    };
  }, [token, refreshBalance]);

  const placeBet = useCallback(async (betType: string) => {
    if (!token || !user) {
      setMessage('请先登录');
      return;
    }
    if (round.status !== 'betting') {
      setMessage('当前不在下注时间');
      return;
    }
    if (selectedChip > balance) {
      setMessage('余额不足');
      return;
    }

    setPlacing(true);
    try {
      const res = await betApi.placeBet(token, {
        roomId: round.roundId,
        betType,
        betAmount: selectedChip,
      });
      setBets((prev) => ({
        ...prev,
        [betType]: (prev[betType] || 0) + selectedChip,
      }));
      updateBalance(res.remainingBalance);
      setMessage(`下注成功: ${BET_TYPES.find((b) => b.key === betType)?.label} ${selectedChip}`);
    } catch (err: any) {
      setMessage(err.message || '下注失败');
    } finally {
      setPlacing(false);
    }
  }, [token, user, round.status, selectedChip, balance, round.roundId, updateBalance]);

  const getCardDisplay = (card: Card) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return { suit: card.suit, rank: card.rank, isRed };
  };

  const winnerLabel = round.result?.winner === 'player' ? '闲赢' : round.result?.winner === 'banker' ? '庄赢' : '和局';

  return (
    <div className="game-page container">
      {/* Game Header */}
      <div className="game-header animate-fade-in">
        <div className="game-title-row">
          <h1>🃏 百家乐</h1>
          <div className="round-info">
            <span className="round-no">第 {round.roundNo} 局</span>
            <span className={`round-status status-${round.status}`}>
              {round.status === 'waiting' && '等待中'}
              {round.status === 'betting' && `下注中 ${round.countdown}s`}
              {round.status === 'closed' && '已截止'}
              {round.status === 'result' && '已开奖'}
            </span>
          </div>
        </div>

        {round.status === 'betting' && (
          <div className="countdown-bar">
            <div className="countdown-progress" style={{ width: `${(round.countdown / 20) * 100}%` }} />
          </div>
        )}
      </div>

      {message && <div className="game-message animate-fade-in">{message}</div>}

      {/* Card Area */}
      <div className="card-area glass-card animate-slide-up">
        <div className="card-side player-side">
          <h3 style={{ color: '#3b82f6' }}>闲 PLAYER</h3>
          <div className="cards-row">
            {round.result ? round.result.playerCards.map((c, i) => {
              const d = getCardDisplay(c);
              return (
                <div key={i} className={`playing-card ${d.isRed ? 'red' : 'black'}`} style={{ animationDelay: `${i * 0.2}s` }}>
                  <span className="card-rank">{d.rank}</span>
                  <span className="card-suit">{d.suit}</span>
                </div>
              );
            }) : [0, 1].map((i) => <div key={i} className="playing-card face-down" />)}
          </div>
          <div className="card-total">{round.result ? round.result.playerTotal : '?'}</div>
        </div>

        <div className="vs-area">
          {round.result && (
            <div className={`winner-badge winner-${round.result.winner}`}>
              {winnerLabel}
            </div>
          )}
          <span className="vs-text">VS</span>
        </div>

        <div className="card-side banker-side">
          <h3 style={{ color: '#ef4444' }}>庄 BANKER</h3>
          <div className="cards-row">
            {round.result ? round.result.bankerCards.map((c, i) => {
              const d = getCardDisplay(c);
              return (
                <div key={i} className={`playing-card ${d.isRed ? 'red' : 'black'}`} style={{ animationDelay: `${(i + 3) * 0.2}s` }}>
                  <span className="card-rank">{d.rank}</span>
                  <span className="card-suit">{d.suit}</span>
                </div>
              );
            }) : [0, 1].map((i) => <div key={i} className="playing-card face-down" />)}
          </div>
          <div className="card-total">{round.result ? round.result.bankerTotal : '?'}</div>
        </div>
      </div>

      {/* Bet Area */}
      <div className="bet-area animate-slide-up" style={{ animationDelay: '0.1s' }}>
        <div className="bet-zones">
          {BET_TYPES.map((bt) => (
            <button
              key={bt.key}
              className={`bet-zone ${round.status !== 'betting' ? 'disabled' : ''}`}
              style={{ borderColor: bt.color }}
              onClick={() => placeBet(bt.key)}
              disabled={round.status !== 'betting' || placing}
              id={`bet-${bt.key}`}
            >
              <span className="bet-label" style={{ color: bt.color }}>{bt.label}</span>
              <span className="bet-odds">{bt.odds}</span>
              {bets[bt.key] && <span className="bet-amount-placed">{bets[bt.key]}</span>}
            </button>
          ))}
        </div>

        {/* Chip Selection */}
        <div className="chip-selection">
          <span className="chip-label">筹码</span>
          <div className="chip-stack">
            {CHIPS.map((c) => (
              <button
                key={c}
                className={`chip chip-${c} ${selectedChip === c ? 'selected' : ''}`}
                onClick={() => setSelectedChip(c)}
                id={`chip-${c}`}
              >
                {c >= 1000 ? `${c / 1000}K` : c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Road (Recent Results) */}
      <div className="road-section glass-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3>路单</h3>
        <div className="road-grid">
          {recentResults.map((r, i) => (
            <div key={i} className={`road-dot road-${r.winner}`} title={`第${round.roundNo - i}局: ${r.winner === 'player' ? '闲' : r.winner === 'banker' ? '庄' : '和'}`}>
              {r.winner === 'player' ? '闲' : r.winner === 'banker' ? '庄' : '和'}
            </div>
          ))}
          {recentResults.length === 0 && <p className="empty-text">暂无记录</p>}
        </div>
      </div>

      <style jsx>{`
        .game-page { padding-bottom: 40px; }
        .game-header { padding: 20px 0; }
        .game-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .game-title-row h1 {
          font-family: var(--font-display);
          font-size: 1.6rem;
          font-weight: 700;
        }
        .round-info { display: flex; align-items: center; gap: 12px; }
        .round-no {
          font-size: 0.9rem;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .round-status {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .status-betting {
          background: rgba(34, 197, 94, 0.15);
          color: var(--accent-green);
        }
        .status-closed, .status-waiting {
          background: rgba(100, 116, 139, 0.15);
          color: var(--text-muted);
        }
        .status-result {
          background: rgba(245, 200, 66, 0.15);
          color: var(--accent-gold);
        }
        .countdown-bar {
          height: 4px;
          background: var(--bg-secondary);
          border-radius: 2px;
          margin-top: 12px;
          overflow: hidden;
        }
        .countdown-progress {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-green), var(--accent-gold));
          border-radius: 2px;
          transition: width 1s linear;
        }
        .game-message {
          padding: 10px 16px;
          background: rgba(245, 200, 66, 0.1);
          border: 1px solid rgba(245, 200, 66, 0.2);
          border-radius: var(--radius-sm);
          color: var(--accent-gold);
          font-size: 0.9rem;
          text-align: center;
          margin-bottom: 16px;
        }

        /* Card Area */
        .card-area {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 24px;
          padding: 32px;
          margin-bottom: 24px;
        }
        .card-side {
          flex: 1;
          text-align: center;
        }
        .card-side h3 {
          font-family: var(--font-display);
          font-size: 1.1rem;
          font-weight: 700;
          margin-bottom: 16px;
          letter-spacing: 0.05em;
        }
        .cards-row {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
          min-height: 84px;
        }
        .card-total {
          font-family: var(--font-display);
          font-size: 2rem;
          font-weight: 800;
          color: var(--accent-gold);
        }
        .vs-area {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .vs-text {
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--text-muted);
          font-family: var(--font-display);
        }
        .winner-badge {
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: 700;
          font-size: 0.9rem;
          animation: fadeIn 0.4s ease-out;
        }
        .winner-player { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .winner-banker { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .winner-tie { background: rgba(34, 197, 94, 0.2); color: #22c55e; }

        /* Bet Area */
        .bet-area { margin-bottom: 24px; }
        .bet-zones {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }
        .bet-zone {
          flex: 1;
          min-width: 100px;
          padding: 20px 12px;
          background: var(--bg-card);
          border: 2px solid;
          border-radius: var(--radius-md);
          cursor: pointer;
          text-align: center;
          transition: all 0.2s;
          position: relative;
        }
        .bet-zone:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
        }
        .bet-zone.disabled, .bet-zone:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .bet-label {
          display: block;
          font-size: 1.3rem;
          font-weight: 800;
          font-family: var(--font-display);
        }
        .bet-odds {
          display: block;
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: 4px;
        }
        .bet-amount-placed {
          position: absolute;
          top: -8px;
          right: -8px;
          background: var(--accent-gold);
          color: #0a0e17;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
        }

        /* Chips */
        .chip-selection {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .chip-label {
          font-size: 0.85rem;
          color: var(--text-secondary);
          font-weight: 500;
        }

        /* Road */
        .road-section { padding: 20px; }
        .road-section h3 {
          font-size: 0.95rem;
          font-weight: 600;
          margin-bottom: 12px;
          color: var(--text-secondary);
        }
        .road-grid {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .road-dot {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          font-weight: 700;
        }
        .road-player { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .road-banker { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .road-tie { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .empty-text { color: var(--text-muted); font-size: 0.85rem; }

        @media (max-width: 768px) {
          .card-area { flex-direction: column; padding: 20px; }
          .bet-zones { flex-direction: column; }
          .bet-zone { min-width: auto; }
          .chip-selection { flex-direction: column; }
        }
      `}</style>
    </div>
  );
}
