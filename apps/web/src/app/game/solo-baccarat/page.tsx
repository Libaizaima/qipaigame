'use client';

import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { soloApi } from '@/lib/api';

interface Card { suit: string; rank: string; value: number; }
interface GameResult {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: 'player' | 'banker' | 'tie';
  playerPair: boolean;
  bankerPair: boolean;
}
interface BetResult {
  betType: string;
  betTypeName: string;
  betAmount: number;
  status: 'WON' | 'LOST';
  payoutAmount: number;
  profit: number;
  isTiePush: boolean;
}
interface RoundResponse {
  roundNo: number;
  newBalance: number;
  totalBet: number;
  totalPayout: number;
  netProfit: number;
  betResults: BetResult[];
  result: GameResult;
}

const BET_TYPES = [
  { key: 'player',      label: '闲',   odds: '1:1',  color: '#3b82f6' },
  { key: 'banker',      label: '庄',   odds: '1:0.95', color: '#ef4444' },
  { key: 'tie',         label: '和',   odds: '1:8',  color: '#22c55e' },
  { key: 'player_pair', label: '闲对', odds: '1:11', color: '#60a5fa' },
  { key: 'banker_pair', label: '庄对', odds: '1:11', color: '#f87171' },
];

const CHIPS = [10, 50, 100, 500, 1000, 5000];

type Phase = 'betting' | 'dealing' | 'result';

export default function SoloBaccaratPage() {
  const { user, token, balance, refreshBalance, updateBalance } = useAuth();
  const [phase, setPhase] = useState<Phase>('betting');
  const [selectedChip, setSelectedChip] = useState(100);
  const [bets, setBets] = useState<Record<string, number>>({});
  const [message, setMessage] = useState('');
  const [roundData, setRoundData] = useState<RoundResponse | null>(null);
  const [recentResults, setRecentResults] = useState<GameResult[]>([]);
  const [dealing, setDealing] = useState(false);
  const [revealedCards, setRevealedCards] = useState(0);

  const totalBet = Object.values(bets).reduce((s, v) => s + v, 0);

  const addBet = (betType: string) => {
    if (phase !== 'betting') return;
    if (selectedChip > balance - totalBet) {
      setMessage('余额不足');
      return;
    }
    setBets((prev) => ({ ...prev, [betType]: (prev[betType] || 0) + selectedChip }));
    setMessage('');
  };

  const clearBets = () => {
    setBets({});
    setMessage('');
  };

  const confirmPlay = useCallback(async () => {
    if (!token || !user) { setMessage('请先登录'); return; }
    if (totalBet === 0) { setMessage('请先下注'); return; }

    const betArray = Object.entries(bets)
      .filter(([, amount]) => amount > 0)
      .map(([betType, betAmount]) => ({ betType, betAmount }));

    setDealing(true);
    setPhase('dealing');
    setRevealedCards(0);

    try {
      const res = await soloApi.play(token, betArray);
      setRoundData(res);
      updateBalance(res.newBalance);
      setRecentResults((prev) => [res.result, ...prev].slice(0, 20));

      // Animate card reveal
      const totalCards = res.result.playerCards.length + res.result.bankerCards.length;
      for (let i = 1; i <= totalCards; i++) {
        await new Promise(r => setTimeout(r, 400));
        setRevealedCards(i);
      }
      await new Promise(r => setTimeout(r, 600));
      setPhase('result');
    } catch (err: any) {
      setMessage(err.message || '操作失败');
      setPhase('betting');
    } finally {
      setDealing(false);
    }
  }, [token, user, bets, totalBet, updateBalance]);

  const newRound = () => {
    setPhase('betting');
    setBets({});
    setRoundData(null);
    setRevealedCards(0);
    setMessage('');
    refreshBalance();
  };

  const getCardDisplay = (card: Card) => {
    const isRed = card.suit === '♥' || card.suit === '♦';
    return { suit: card.suit, rank: card.rank, isRed };
  };

  const renderCards = (cards: Card[], startIndex: number) => {
    return cards.map((c, i) => {
      const globalIndex = startIndex + i;
      const revealed = globalIndex < revealedCards;
      if (!revealed) {
        return <div key={i} className="playing-card face-down card-deal" style={{ animationDelay: `${globalIndex * 0.15}s` }} />;
      }
      const d = getCardDisplay(c);
      return (
        <div key={i} className={`playing-card ${d.isRed ? 'red' : 'black'} card-flip`} style={{ animationDelay: `${globalIndex * 0.15}s` }}>
          <span className="card-rank">{d.rank}</span>
          <span className="card-suit">{d.suit}</span>
        </div>
      );
    });
  };

  const winnerLabel = roundData?.result?.winner === 'player' ? '闲赢' : roundData?.result?.winner === 'banker' ? '庄赢' : '和局';

  return (
    <div className="game-page container">
      {/* Header */}
      <div className="game-header animate-fade-in">
        <div className="game-title-row">
          <h1>🎴 单人百家乐</h1>
          <div className="round-info">
            {roundData && <span className="round-no">第 {roundData.roundNo} 局</span>}
            <span className={`round-status status-${phase}`}>
              {phase === 'betting' && '下注中'}
              {phase === 'dealing' && '发牌中...'}
              {phase === 'result' && '已开奖'}
            </span>
          </div>
        </div>
      </div>

      {message && <div className="game-message animate-fade-in">{message}</div>}

      {/* Card Area */}
      <div className="card-area glass-card animate-slide-up">
        <div className="card-side player-side">
          <h3 style={{ color: '#3b82f6' }}>闲 PLAYER</h3>
          <div className="cards-row">
            {(phase === 'dealing' || phase === 'result') && roundData
              ? renderCards(roundData.result.playerCards, 0)
              : [0, 1].map(i => <div key={i} className="playing-card face-down" />)
            }
          </div>
          <div className="card-total">
            {phase === 'result' && roundData ? roundData.result.playerTotal : '?'}
          </div>
        </div>

        <div className="vs-area">
          {phase === 'result' && roundData && (
            <div className={`winner-badge winner-${roundData.result.winner}`}>
              {winnerLabel}
            </div>
          )}
          <span className="vs-text">VS</span>
          {roundData?.result.playerPair && phase === 'result' && <span className="pair-badge player-pair-badge">闲对</span>}
          {roundData?.result.bankerPair && phase === 'result' && <span className="pair-badge banker-pair-badge">庄对</span>}
        </div>

        <div className="card-side banker-side">
          <h3 style={{ color: '#ef4444' }}>庄 BANKER</h3>
          <div className="cards-row">
            {(phase === 'dealing' || phase === 'result') && roundData
              ? renderCards(roundData.result.bankerCards, roundData.result.playerCards.length)
              : [0, 1].map(i => <div key={i} className="playing-card face-down" />)
            }
          </div>
          <div className="card-total">
            {phase === 'result' && roundData ? roundData.result.bankerTotal : '?'}
          </div>
        </div>
      </div>

      {/* Result Summary */}
      {phase === 'result' && roundData && (
        <div className="result-summary glass-card animate-slide-up">
          <div className="result-header">
            <span className={`net-profit ${roundData.netProfit >= 0 ? 'profit-positive' : 'profit-negative'}`}>
              {roundData.netProfit >= 0 ? '+' : ''}{roundData.netProfit.toLocaleString()}
            </span>
            <span className="result-label">
              {roundData.netProfit > 0 ? '🎉 恭喜赢得' : roundData.netProfit === 0 ? '↩️ 平局退还' : '💔 本局亏损'}
            </span>
          </div>
          <div className="result-details">
            {roundData.betResults.map((br, i) => (
              <div key={i} className={`result-item result-${br.status.toLowerCase()}`}>
                <span className="ri-type">{br.betTypeName}</span>
                <span className="ri-bet">下注 {br.betAmount}</span>
                <span className={`ri-result ${br.status === 'WON' ? 'text-win' : 'text-lose'}`}>
                  {br.isTiePush ? '退还' : br.status === 'WON' ? `+${br.payoutAmount}` : `-${br.betAmount}`}
                </span>
              </div>
            ))}
          </div>
          <button className="btn-new-round" onClick={newRound} id="new-round-btn">
            🔄 再来一局
          </button>
        </div>
      )}

      {/* Bet Area */}
      {phase === 'betting' && (
        <div className="bet-area animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="bet-zones">
            {BET_TYPES.map((bt) => (
              <button
                key={bt.key}
                className="bet-zone"
                style={{ borderColor: bt.color }}
                onClick={() => addBet(bt.key)}
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

          {/* action bar */}
          <div className="action-bar">
            <div className="total-bet-info">
              总下注: <strong>{totalBet.toLocaleString()}</strong>
            </div>
            <div className="action-buttons">
              <button className="btn-clear" onClick={clearBets} disabled={totalBet === 0} id="clear-bets-btn">
                🗑️ 取消所有
              </button>
              <button className="btn-deal" onClick={confirmPlay} disabled={totalBet === 0 || dealing} id="confirm-deal-btn">
                {dealing ? '发牌中...' : '✅ 确认下注'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Road (Recent Results) */}
      <div className="road-section glass-card animate-slide-up" style={{ animationDelay: '0.2s' }}>
        <h3>路单</h3>
        <div className="road-grid">
          {recentResults.map((r, i) => (
            <div key={i} className={`road-dot road-${r.winner}`}>
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
          display: flex; align-items: center; justify-content: space-between;
        }
        .game-title-row h1 {
          font-family: var(--font-display); font-size: 1.6rem; font-weight: 700;
        }
        .round-info { display: flex; align-items: center; gap: 12px; }
        .round-no { font-size: 0.9rem; color: var(--text-secondary); font-weight: 500; }
        .round-status {
          padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600;
        }
        .status-betting { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); }
        .status-dealing { background: rgba(245, 200, 66, 0.15); color: var(--accent-gold); }
        .status-result { background: rgba(168, 85, 247, 0.15); color: #a855f7; }
        .game-message {
          padding: 10px 16px;
          background: rgba(245, 200, 66, 0.1); border: 1px solid rgba(245, 200, 66, 0.2);
          border-radius: var(--radius-sm); color: var(--accent-gold);
          font-size: 0.9rem; text-align: center; margin-bottom: 16px;
        }

        /* Card Area */
        .card-area {
          display: flex; align-items: center; justify-content: center;
          gap: 24px; padding: 32px; margin-bottom: 24px;
        }
        .card-side { flex: 1; text-align: center; }
        .card-side h3 {
          font-family: var(--font-display); font-size: 1.1rem; font-weight: 700;
          margin-bottom: 16px; letter-spacing: 0.05em;
        }
        .cards-row {
          display: flex; justify-content: center; gap: 8px;
          margin-bottom: 12px; min-height: 84px;
        }
        .card-total {
          font-family: var(--font-display); font-size: 2rem; font-weight: 800;
          color: var(--accent-gold);
        }
        .vs-area {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
        }
        .vs-text {
          font-size: 1.2rem; font-weight: 800; color: var(--text-muted);
          font-family: var(--font-display);
        }
        .winner-badge {
          padding: 6px 16px; border-radius: 20px; font-weight: 700;
          font-size: 0.9rem; animation: fadeIn 0.4s ease-out;
        }
        .winner-player { background: rgba(59, 130, 246, 0.2); color: #3b82f6; }
        .winner-banker { background: rgba(239, 68, 68, 0.2); color: #ef4444; }
        .winner-tie { background: rgba(34, 197, 94, 0.2); color: #22c55e; }
        .pair-badge {
          padding: 3px 10px; border-radius: 12px; font-size: 0.7rem;
          font-weight: 700; animation: fadeIn 0.5s ease-out;
        }
        .player-pair-badge { background: rgba(59, 130, 246, 0.15); color: #60a5fa; }
        .banker-pair-badge { background: rgba(239, 68, 68, 0.15); color: #f87171; }

        /* Card animations */
        .card-deal { animation: cardDeal 0.3s ease-out both; }
        .card-flip { animation: cardFlip 0.4s ease-out both; }
        @keyframes cardDeal {
          from { transform: translateY(-30px) scale(0.8); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes cardFlip {
          0% { transform: rotateY(90deg) scale(0.9); }
          100% { transform: rotateY(0deg) scale(1); }
        }

        /* Result Summary */
        .result-summary { padding: 24px; margin-bottom: 24px; text-align: center; }
        .result-header { margin-bottom: 16px; }
        .net-profit {
          font-family: var(--font-display); font-size: 2.2rem; font-weight: 800;
          display: block; margin-bottom: 4px;
        }
        .profit-positive { color: var(--accent-green); }
        .profit-negative { color: #ef4444; }
        .result-label { font-size: 0.9rem; color: var(--text-secondary); }
        .result-details {
          display: flex; flex-direction: column; gap: 8px;
          margin: 20px 0; max-width: 360px; margin-left: auto; margin-right: auto;
        }
        .result-item {
          display: flex; justify-content: space-between; align-items: center;
          padding: 8px 14px; border-radius: var(--radius-sm);
          background: rgba(255,255,255,0.03); font-size: 0.88rem;
        }
        .ri-type { font-weight: 600; }
        .ri-bet { color: var(--text-muted); }
        .text-win { color: var(--accent-green); font-weight: 700; }
        .text-lose { color: #ef4444; font-weight: 700; }
        .btn-new-round {
          margin-top: 20px; padding: 12px 40px;
          border-radius: var(--radius-md); border: none;
          background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-dim));
          color: #0a0e17; font-weight: 700; font-size: 1rem;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-new-round:hover { transform: translateY(-2px); box-shadow: 0 4px 20px rgba(245, 200, 66, 0.3); }

        /* Bet Area */
        .bet-area { margin-bottom: 24px; }
        .bet-zones { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
        .bet-zone {
          flex: 1; min-width: 100px; padding: 20px 12px;
          background: var(--bg-card); border: 2px solid;
          border-radius: var(--radius-md); cursor: pointer;
          text-align: center; transition: all 0.2s; position: relative;
        }
        .bet-zone:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
        .bet-label {
          display: block; font-size: 1.3rem; font-weight: 800;
          font-family: var(--font-display);
        }
        .bet-odds { display: block; font-size: 0.75rem; color: var(--text-muted); margin-top: 4px; }
        .bet-amount-placed {
          position: absolute; top: -8px; right: -8px;
          background: var(--accent-gold); color: #0a0e17;
          padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 700;
        }

        /* Chips */
        .chip-selection { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
        .chip-label { font-size: 0.85rem; color: var(--text-secondary); font-weight: 500; }

        /* Action Bar */
        .action-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; background: var(--bg-card);
          border-radius: var(--radius-md); border: 1px solid var(--border-color);
        }
        .total-bet-info {
          font-size: 0.95rem; color: var(--text-secondary);
        }
        .total-bet-info strong {
          color: var(--accent-gold); font-family: var(--font-display); font-size: 1.1rem;
        }
        .action-buttons { display: flex; gap: 12px; }
        .btn-clear {
          padding: 10px 20px; border-radius: var(--radius-sm);
          border: 1px solid var(--border-color); background: transparent;
          color: var(--text-secondary); cursor: pointer; font-size: 0.88rem;
          transition: all 0.2s;
        }
        .btn-clear:hover:not(:disabled) { border-color: #ef4444; color: #ef4444; }
        .btn-clear:disabled { opacity: 0.4; cursor: not-allowed; }
        .btn-deal {
          padding: 10px 28px; border-radius: var(--radius-sm); border: none;
          background: linear-gradient(135deg, var(--accent-green), #16a34a);
          color: #fff; font-weight: 700; font-size: 0.95rem;
          cursor: pointer; transition: all 0.2s;
        }
        .btn-deal:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(34, 197, 94, 0.3); }
        .btn-deal:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Road */
        .road-section { padding: 20px; }
        .road-section h3 {
          font-size: 0.95rem; font-weight: 600; margin-bottom: 12px; color: var(--text-secondary);
        }
        .road-grid { display: flex; gap: 6px; flex-wrap: wrap; }
        .road-dot {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.6rem; font-weight: 700;
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
          .action-bar { flex-direction: column; gap: 12px; text-align: center; }
          .action-buttons { width: 100%; }
          .btn-clear, .btn-deal { flex: 1; }
        }
      `}</style>
    </div>
  );
}
