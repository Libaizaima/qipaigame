"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
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
    await prisma.wallet.upsert({
        where: { userId: admin.id },
        update: {},
        create: {
            userId: admin.id,
            balance: 0,
        },
    });
    console.log(`✅ Admin user created: admin / admin123456`);
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
});
//# sourceMappingURL=seed.js.map