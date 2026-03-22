import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  console.log('🌱 Seeding database...');

  // ===== 创建游戏 =====
  const baccarat = await prisma.game.upsert({
    where: { code: 'baccarat' },
    update: {},
    create: {
      code: 'baccarat',
      name: '百家乐',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Game created: ${baccarat.name}`);

  const dice = await prisma.game.upsert({
    where: { code: 'dice' },
    update: {},
    create: {
      code: 'dice',
      name: '骰子',
      status: 'ACTIVE',
    },
  });
  console.log(`✅ Game created: ${dice.name}`);

  // ===== 创建默认房间 =====
  const baccaratRoom = await prisma.gameRoom.upsert({
    where: { roomCode: 'baccarat-01' },
    update: {},
    create: {
      gameId: baccarat.id,
      roomCode: 'baccarat-01',
      roomName: '百家乐经典厅',
      status: 'ACTIVE',
      minBet: 10,
      maxBet: 10000,
      bettingSeconds: 20,
    },
  });
  console.log(`✅ Room created: ${baccaratRoom.roomName}`);

  const diceRoom = await prisma.gameRoom.upsert({
    where: { roomCode: 'dice-01' },
    update: {},
    create: {
      gameId: dice.id,
      roomCode: 'dice-01',
      roomName: '骰宝经典厅',
      status: 'ACTIVE',
      minBet: 10,
      maxBet: 10000,
      bettingSeconds: 15,
    },
  });
  console.log(`✅ Room created: ${diceRoom.roomName}`);

  // ===== 创建单人百家乐房间 =====
  const soloBaccaratRoom = await prisma.gameRoom.upsert({
    where: { roomCode: 'solo-baccarat-01' },
    update: {},
    create: {
      gameId: baccarat.id,
      roomCode: 'solo-baccarat-01',
      roomName: '单人百家乐',
      status: 'ACTIVE',
      minBet: 10,
      maxBet: 50000,
      bettingSeconds: 0,
    },
  });
  console.log(`✅ Room created: ${soloBaccaratRoom.roomName}`);

  // ===== 创建管理员账号 =====
  const adminPasswordHash = await bcrypt.hash('admin123456', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // 创建管理员钱包
  await prisma.wallet.upsert({
    where: { userId: admin.id },
    update: {},
    create: {
      userId: admin.id,
      balance: 0,
    },
  });
  console.log(`✅ Admin user created: admin / admin123456`);

  // ===== 创建测试玩家 =====
  const playerPasswordHash = await bcrypt.hash('player123456', 10);
  const player = await prisma.user.upsert({
    where: { username: 'player1' },
    update: {},
    create: {
      username: 'player1',
      passwordHash: playerPasswordHash,
      role: 'PLAYER',
      status: 'ACTIVE',
    },
  });

  const playerWallet = await prisma.wallet.upsert({
    where: { userId: player.id },
    update: {},
    create: {
      userId: player.id,
      balance: 10000,
    },
  });

  await prisma.walletTransaction.create({
    data: {
      userId: player.id,
      walletId: playerWallet.id,
      type: 'BONUS',
      amount: 10000,
      beforeBalance: 0,
      afterBalance: 10000,
      referenceType: 'REGISTER_BONUS',
      referenceId: player.id,
    },
  }).catch(() => {
    // 幂等：忽略已存在的记录
  });

  console.log(`✅ Test player created: player1 / player123456 (balance: 10,000)`);

  console.log('\n🎉 Seed completed!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
