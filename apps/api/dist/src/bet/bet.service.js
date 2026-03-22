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
var BetService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const wallet_service_1 = require("../wallet/wallet.service");
const ws_service_1 = require("../ws/ws.service");
const baccarat_engine_1 = require("../game/engines/baccarat.engine");
const dice_engine_1 = require("../game/engines/dice.engine");
let BetService = BetService_1 = class BetService {
    prisma;
    walletService;
    wsService;
    logger = new common_1.Logger(BetService_1.name);
    constructor(prisma, walletService, wsService) {
        this.prisma = prisma;
        this.walletService = walletService;
        this.wsService = wsService;
    }
    async placeBet(userId, dto) {
        const room = await this.prisma.gameRoom.findUnique({
            where: { id: dto.roomId },
            include: { game: true },
        });
        if (!room) {
            throw new common_1.BadRequestException('房间不存在');
        }
        if (room.status !== 'ACTIVE') {
            throw new common_1.BadRequestException('房间已暂停');
        }
        if (!room.currentRoundId) {
            throw new common_1.BadRequestException('当前没有进行中的局');
        }
        const round = await this.prisma.gameRound.findUnique({
            where: { id: room.currentRoundId },
        });
        if (!round || round.status !== 'BETTING') {
            throw new common_1.BadRequestException('当前不在下注时间');
        }
        const gameCode = room.game.code;
        const validBetTypes = gameCode === 'baccarat' ? baccarat_engine_1.BACCARAT_BET_TYPES : dice_engine_1.DICE_BET_TYPES;
        if (!validBetTypes[dto.betType]) {
            throw new common_1.BadRequestException(`无效的下注类型: ${dto.betType}`);
        }
        if (dto.betAmount < Number(room.minBet)) {
            throw new common_1.BadRequestException(`最小下注金额: ${room.minBet}`);
        }
        if (dto.betAmount > Number(room.maxBet)) {
            throw new common_1.BadRequestException(`最大下注金额: ${room.maxBet}`);
        }
        if (dto.idempotencyKey) {
            const existing = await this.prisma.bet.findUnique({
                where: { idempotencyKey: dto.idempotencyKey },
            });
            if (existing) {
                return {
                    betId: existing.id,
                    message: '下注已存在（幂等）',
                };
            }
        }
        const odds = validBetTypes[dto.betType].odds;
        const result = await this.prisma.$transaction(async (tx) => {
            const bet = await tx.bet.create({
                data: {
                    userId,
                    gameId: room.gameId,
                    roomId: room.id,
                    roundId: round.id,
                    betType: dto.betType,
                    betAmount: dto.betAmount,
                    odds,
                    status: 'PENDING',
                    idempotencyKey: dto.idempotencyKey,
                },
            });
            const remainingBalance = await this.walletService.deductForBet(tx, userId, dto.betAmount, bet.id);
            return {
                betId: bet.id,
                remainingBalance,
            };
        });
        this.wsService.broadcastToRoom(dto.roomId, 'bet_placed', {
            userId,
            betType: dto.betType,
            betAmount: dto.betAmount,
            roundId: round.id,
        });
        this.logger.log(`User ${userId} placed bet: ${dto.betType} $${dto.betAmount} in round ${round.roundNo}`);
        return {
            betId: result.betId,
            remainingBalance: result.remainingBalance,
            message: '下注成功',
        };
    }
    async getMyBets(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [bets, total] = await Promise.all([
            this.prisma.bet.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    game: { select: { code: true, name: true } },
                    round: { select: { roundNo: true, status: true } },
                },
            }),
            this.prisma.bet.count({ where: { userId } }),
        ]);
        return {
            items: bets,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
};
exports.BetService = BetService;
exports.BetService = BetService = BetService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        wallet_service_1.WalletService,
        ws_service_1.WsService])
], BetService);
//# sourceMappingURL=bet.service.js.map