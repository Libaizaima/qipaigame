"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WalletService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let WalletService = WalletService_1 = class WalletService {
    prisma;
    logger = new common_1.Logger(WalletService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async deductForBet(tx, userId, amount, referenceId) {
        const wallets = await tx.$queryRaw `
      SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;
        const wallet = wallets[0];
        if (!wallet) {
            throw new common_1.BadRequestException('钱包不存在');
        }
        const currentBalance = Number(wallet.balance);
        if (currentBalance < amount) {
            throw new common_1.BadRequestException('余额不足');
        }
        const newBalance = currentBalance - amount;
        await tx.wallet.update({
            where: { userId },
            data: { balance: newBalance },
        });
        await tx.walletTransaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: 'BET_PLACE',
                amount: -amount,
                beforeBalance: currentBalance,
                afterBalance: newBalance,
                referenceType: 'BET',
                referenceId,
            },
        });
        return newBalance;
    }
    async creditForWin(tx, userId, amount, referenceId) {
        const wallets = await tx.$queryRaw `
      SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;
        const wallet = wallets[0];
        if (!wallet) {
            this.logger.error(`Wallet not found for user ${userId}`);
            return;
        }
        const currentBalance = Number(wallet.balance);
        const newBalance = currentBalance + amount;
        await tx.wallet.update({
            where: { userId },
            data: { balance: newBalance },
        });
        await tx.walletTransaction.create({
            data: {
                userId,
                walletId: wallet.id,
                type: 'BET_WIN',
                amount,
                beforeBalance: currentBalance,
                afterBalance: newBalance,
                referenceType: 'BET_WIN',
                referenceId,
            },
        });
        return newBalance;
    }
    async getTransactions(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [transactions, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
            }),
            this.prisma.walletTransaction.count({ where: { userId } }),
        ]);
        return {
            items: transactions,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
};
exports.WalletService = WalletService;
exports.WalletService = WalletService = WalletService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], WalletService);
//# sourceMappingURL=wallet.service.js.map