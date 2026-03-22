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
var SettlementService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettlementService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const wallet_service_1 = require("../wallet/wallet.service");
const ws_service_1 = require("../ws/ws.service");
const baccarat_engine_1 = require("../game/engines/baccarat.engine");
const dice_engine_1 = require("../game/engines/dice.engine");
let SettlementService = SettlementService_1 = class SettlementService {
    prisma;
    redisService;
    walletService;
    wsService;
    logger = new common_1.Logger(SettlementService_1.name);
    constructor(prisma, redisService, walletService, wsService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.walletService = walletService;
        this.wsService = wsService;
    }
    async settleRound(roundId, gameCode, result) {
        const lockKey = `settlement:lock:${roundId}`;
        const acquired = await this.redisService.acquireLock(lockKey, 60);
        if (!acquired) {
            this.logger.warn(`Settlement already in progress for round ${roundId}`);
            return;
        }
        try {
            const round = await this.prisma.gameRound.findUnique({
                where: { id: roundId },
            });
            if (round?.status === 'FINISHED') {
                this.logger.warn(`Round ${roundId} already settled`);
                return;
            }
            const bets = await this.prisma.bet.findMany({
                where: {
                    roundId,
                    status: 'PENDING',
                },
            });
            this.logger.log(`Settling ${bets.length} bets for round ${roundId}`);
            for (const bet of bets) {
                await this.settleBet(bet, gameCode, result);
            }
            this.logger.log(`Round ${roundId} settlement complete`);
        }
        catch (error) {
            this.logger.error(`Settlement error for round ${roundId}:`, error);
            throw error;
        }
        finally {
            await this.redisService.releaseLock(lockKey);
        }
    }
    async settleBet(bet, gameCode, result) {
        let payoutAmount = 0;
        let status = 'LOST';
        if (gameCode === 'baccarat') {
            payoutAmount = baccarat_engine_1.BaccaratEngine.calculatePayout(bet.betType, Number(bet.betAmount), result);
        }
        else if (gameCode === 'dice') {
            payoutAmount = dice_engine_1.DiceEngine.calculatePayout(bet.betType, Number(bet.betAmount), result);
        }
        const baccaratResult = result;
        const isTiePush = gameCode === 'baccarat' &&
            baccaratResult.winner === 'tie' &&
            (bet.betType === 'player' || bet.betType === 'banker');
        if (payoutAmount > 0) {
            status = isTiePush ? 'LOST' : 'WON';
            if (isTiePush)
                status = 'WON';
            await this.prisma.$transaction(async (tx) => {
                await tx.bet.update({
                    where: { id: bet.id },
                    data: { status, payoutAmount },
                });
                await this.walletService.creditForWin(tx, bet.userId, payoutAmount, bet.id);
            });
            this.wsService.sendToUser(bet.userId, 'wallet_updated', {
                type: isTiePush ? 'refund' : 'win',
                amount: payoutAmount,
                betId: bet.id,
            });
        }
        else {
            await this.prisma.bet.update({
                where: { id: bet.id },
                data: { status: 'LOST', payoutAmount: 0 },
            });
        }
    }
};
exports.SettlementService = SettlementService;
exports.SettlementService = SettlementService = SettlementService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        wallet_service_1.WalletService,
        ws_service_1.WsService])
], SettlementService);
//# sourceMappingURL=settlement.service.js.map