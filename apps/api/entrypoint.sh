#!/bin/sh
set -e

echo "🔄 Syncing database schema..."
# Prisma 7: prisma.config.ts cannot run in production, use --url directly
npx prisma db push --skip-generate --accept-data-loss --url "$DATABASE_URL" 2>&1 || echo "⚠️ Schema push had issues, continuing..."

echo "🌱 Seeding data..."
node -e "
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const p = new PrismaClient({ adapter });
(async () => {
  const baccarat = await p.game.upsert({ where: { code: 'baccarat' }, update: {}, create: { code: 'baccarat', name: '百家乐' } });
  const dice = await p.game.upsert({ where: { code: 'dice' }, update: {}, create: { code: 'dice', name: '骰宝' } });
  await p.gameRoom.upsert({ where: { roomCode: 'baccarat-room-1' }, update: {}, create: { gameId: baccarat.id, roomCode: 'baccarat-room-1', roomName: '百家乐1号厅', minBet: 10, maxBet: 10000, bettingSeconds: 20 } });
  await p.gameRoom.upsert({ where: { roomCode: 'dice-room-1' }, update: {}, create: { gameId: dice.id, roomCode: 'dice-room-1', roomName: '骰宝1号厅', minBet: 10, maxBet: 10000, bettingSeconds: 15 } });
  const adminHash = await bcrypt.hash('admin123456', 10);
  const admin = await p.user.upsert({ where: { username: 'admin' }, update: {}, create: { username: 'admin', passwordHash: adminHash, role: 'ADMIN' } });
  await p.wallet.upsert({ where: { userId: admin.id }, update: {}, create: { userId: admin.id, balance: 0 } });
  const playerHash = await bcrypt.hash('player123456', 10);
  const player = await p.user.upsert({ where: { username: 'player1' }, update: {}, create: { username: 'player1', passwordHash: playerHash, role: 'PLAYER' } });
  await p.wallet.upsert({ where: { userId: player.id }, update: {}, create: { userId: player.id, balance: 10000 } });
  console.log('✅ Seed done');
  await p.\$disconnect();
  await pool.end();
})().catch(e => { console.error('⚠️ Seed error:', e.message); process.exit(0); });
" 2>&1

echo "🚀 Starting application..."
node dist/src/main.js
