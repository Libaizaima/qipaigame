'use client';

import Link from 'next/link';

const games = [
  {
    code: 'baccarat',
    name: '百家乐',
    icon: '🃏',
    description: '经典百家乐，支持庄、闲、和、对子等多种玩法',
    gradient: 'linear-gradient(135deg, #1a3a5c 0%, #2c5282 50%, #1e40af 100%)',
    href: '/game/baccarat',
    tags: ['经典', '高赔率'],
  },
  {
    code: 'solo-baccarat',
    name: '单人百家乐',
    icon: '🎴',
    description: '自主节奏，随时下注开牌。支持多注区同时下注，一键发牌即时开奖',
    gradient: 'linear-gradient(135deg, #1a4a3a 0%, #22735a 50%, #059669 100%)',
    href: '/game/solo-baccarat',
    tags: ['单人', '即时开奖'],
  },
  {
    code: 'dice',
    name: '骰宝',
    icon: '🎲',
    description: '三骰子开奖，大小、单双、指定点数，快节奏体验',
    gradient: 'linear-gradient(135deg, #5b2c6f 0%, #7d3c98 50%, #a855f7 100%)',
    href: '/game/dice',
    tags: ['快开', '多玩法'],
  },
];

export default function LobbyPage() {
  return (
    <div className="lobby-page container">
      {/* Hero Banner */}
      <section className="hero animate-slide-up">
        <div className="hero-content">
          <h1 className="hero-title">
            <span className="hero-highlight">AM-GAME</span> 棋牌游戏平台
          </h1>
          <p className="hero-subtitle">
            公平 · 透明 · 快速 — 虚拟筹码畅玩，注册即送 10,000
          </p>
          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-value">3</span>
              <span className="stat-label">热门游戏</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">24/7</span>
              <span className="stat-label">全天开放</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-value">∞</span>
              <span className="stat-label">畅玩无限</span>
            </div>
          </div>
        </div>
      </section>

      {/* Game Grid */}
      <section className="games-section">
        <h2 className="section-title">选择游戏</h2>
        <div className="games-grid">
          {games.map((game, i) => (
            <Link href={game.href} key={game.code} className="game-card glass-card glass-card-hover" id={`game-${game.code}`} style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="game-card-bg" style={{ background: game.gradient }} />
              <div className="game-card-content">
                <div className="game-icon">{game.icon}</div>
                <h3 className="game-name">{game.name}</h3>
                <p className="game-desc">{game.description}</p>
                <div className="game-tags">
                  {game.tags.map((tag) => (
                    <span key={tag} className="badge badge-gold">{tag}</span>
                  ))}
                </div>
                <div className="game-enter">
                  进入游戏 →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="features-section">
        <div className="features-grid">
          {[
            { icon: '🔒', title: '安全公平', desc: '服务端权威，密码学安全随机' },
            { icon: '⚡', title: '实时体验', desc: 'WebSocket 实时推送开奖结果' },
            { icon: '📊', title: '透明记录', desc: '完整账变流水，每一笔可追溯' },
            { icon: '🎁', title: '免费筹码', desc: '注册即送，畅玩无压力' },
          ].map((f) => (
            <div key={f.title} className="feature-item glass-card">
              <span className="feature-icon">{f.icon}</span>
              <h4>{f.title}</h4>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <style jsx>{`
        .lobby-page { padding-bottom: 60px; }

        /* Hero */
        .hero {
          text-align: center;
          padding: 60px 0 48px;
        }
        .hero-title {
          font-family: var(--font-display);
          font-size: 2.6rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 12px;
        }
        .hero-highlight {
          background: linear-gradient(135deg, var(--accent-gold), #ffd700, var(--accent-gold-dim));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-subtitle {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin-bottom: 32px;
        }
        .hero-stats {
          display: inline-flex;
          align-items: center;
          gap: 24px;
          padding: 16px 32px;
          background: var(--bg-glass);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          backdrop-filter: blur(10px);
        }
        .stat-item { text-align: center; }
        .stat-value {
          display: block;
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--accent-gold);
        }
        .stat-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          letter-spacing: 0.05em;
        }
        .stat-divider {
          width: 1px;
          height: 32px;
          background: var(--border-color);
        }

        /* Games Section */
        .section-title {
          font-family: var(--font-display);
          font-size: 1.4rem;
          font-weight: 700;
          margin-bottom: 24px;
          color: var(--text-primary);
        }
        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 24px;
        }
        .game-card {
          position: relative;
          overflow: hidden;
          text-decoration: none;
          color: var(--text-primary);
          min-height: 280px;
          display: flex;
          animation: fadeIn 0.5s ease-out both;
        }
        .game-card-bg {
          position: absolute;
          inset: 0;
          opacity: 0.15;
          transition: opacity 0.3s;
        }
        .game-card:hover .game-card-bg { opacity: 0.25; }
        .game-card-content {
          position: relative;
          padding: 32px;
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .game-icon { font-size: 3rem; margin-bottom: 16px; }
        .game-name {
          font-family: var(--font-display);
          font-size: 1.5rem;
          font-weight: 700;
          margin-bottom: 8px;
        }
        .game-desc {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.5;
          margin-bottom: 16px;
          flex: 1;
        }
        .game-tags {
          display: flex;
          gap: 8px;
          margin-bottom: 16px;
        }
        .game-enter {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--accent-gold);
          transition: transform 0.2s;
        }
        .game-card:hover .game-enter { transform: translateX(4px); }

        /* Features */
        .features-section { margin-top: 48px; }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
          gap: 16px;
        }
        .feature-item {
          padding: 24px;
          text-align: center;
        }
        .feature-icon { font-size: 2rem; display: block; margin-bottom: 12px; }
        .feature-item h4 {
          font-size: 1rem;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .feature-item p {
          font-size: 0.82rem;
          color: var(--text-secondary);
          line-height: 1.4;
        }

        @media (max-width: 768px) {
          .hero-title { font-size: 1.8rem; }
          .games-grid { grid-template-columns: 1fr; }
          .hero-stats { gap: 16px; padding: 12px 20px; }
        }
      `}</style>
    </div>
  );
}
