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
var GameLoopService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameLoopService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
const baccarat_engine_1 = require("./engines/baccarat.engine");
const dice_engine_1 = require("./engines/dice.engine");
const settlement_service_1 = require("../settlement/settlement.service");
const ws_service_1 = require("../ws/ws.service");
let GameLoopService = GameLoopService_1 = class GameLoopService {
    prisma;
    redisService;
    configService;
    settlementService;
    wsService;
    logger = new common_1.Logger(GameLoopService_1.name);
    roomTimers = new Map();
    isRunning = false;
    constructor(prisma, redisService, configService, settlementService, wsService) {
        this.prisma = prisma;
        this.redisService = redisService;
        this.configService = configService;
        this.settlementService = settlementService;
        this.wsService = wsService;
    }
    async onModuleInit() {
        await this.initializeRooms();
    }
    onModuleDestroy() {
        this.stopAllLoops();
    }
    async initializeRooms() {
        const rooms = await this.prisma.gameRoom.findMany({
            where: { status: 'ACTIVE' },
            include: { game: true },
        });
        for (const room of rooms) {
            this.startRoomLoop(room.id, room.game.code, room.bettingSeconds);
        }
        this.isRunning = true;
        this.logger.log(`Initialized ${rooms.length} room loops`);
    }
    startRoomLoop(roomId, gameCode, bettingSeconds) {
        if (this.roomTimers.has(roomId)) {
            return;
        }
        this.logger.log(`Starting game loop for room ${roomId} (${gameCode})`);
        this.runRound(roomId, gameCode, bettingSeconds);
    }
    stopRoomLoop(roomId) {
        const timer = this.roomTimers.get(roomId);
        if (timer) {
            clearTimeout(timer);
            this.roomTimers.delete(roomId);
            this.logger.log(`Stopped game loop for room ${roomId}`);
        }
    }
    stopAllLoops() {
        for (const [roomId, timer] of this.roomTimers) {
            clearTimeout(timer);
        }
        this.roomTimers.clear();
        this.isRunning = false;
    }
    async runRound(roomId, gameCode, bettingSeconds) {
        try {
            const round = await this.createNewRound(roomId, gameCode);
            this.logger.log(`Round ${round.roundNo} created for room ${roomId}`);
            this.wsService.broadcastToRoom(roomId, 'round_start', {
                roundId: round.id,
                roundNo: round.roundNo,
                bettingSeconds,
                status: 'BETTING',
            });
            await this.updateRoundStatus(round.id, 'BETTING');
            await this.runCountdown(roomId, bettingSeconds);
            await this.updateRoundStatus(round.id, 'CLOSED');
            this.wsService.broadcastToRoom(roomId, 'round_closed', {
                roundId: round.id,
                roundNo: round.roundNo,
            });
            await this.sleep(1000);
            await this.updateRoundStatus(round.id, 'DRAWING');
            const result = this.executeGame(gameCode);
            const room = await this.prisma.gameRoom.findUnique({ where: { id: roomId } });
            await this.prisma.roundResult.create({
                data: {
                    roundId: round.id,
                    gameId: room.gameId,
                    resultPayload: result,
                },
            });
            await this.updateRoundStatus(round.id, 'SETTLING');
            this.wsService.broadcastToRoom(roomId, 'round_result', {
                roundId: round.id,
                roundNo: round.roundNo,
                result,
            });
            await this.settlementService.settleRound(round.id, gameCode, result);
            await this.updateRoundStatus(round.id, 'FINISHED');
            await this.cacheRecentResult(roomId, round.roundNo, result);
            await this.sleep(3000);
        }
        catch (error) {
            this.logger.error(`Error in game loop for room ${roomId}:`, error);
            await this.sleep(5000);
        }
        const room = await this.prisma.gameRoom.findUnique({ where: { id: roomId } });
        if (room && room.status === 'ACTIVE') {
            const timer = setTimeout(() => {
                this.runRound(roomId, gameCode, bettingSeconds);
            }, 500);
            this.roomTimers.set(roomId, timer);
        }
        else {
            this.roomTimers.delete(roomId);
            this.logger.log(`Room ${roomId} is no longer active, stopping loop`);
        }
    }
    async createNewRound(roomId, gameCode) {
        const room = await this.prisma.gameRoom.findUnique({
            where: { id: roomId },
        });
        const lastRound = await this.prisma.gameRound.findFirst({
            where: { roomId },
            orderBy: { roundNo: 'desc' },
        });
        const roundNo = (lastRound?.roundNo ?? 0) + 1;
        const round = await this.prisma.gameRound.create({
            data: {
                gameId: room.gameId,
                roomId,
                roundNo,
                status: 'WAITING',
                startAt: new Date(),
            },
        });
        await this.prisma.gameRoom.update({
            where: { id: roomId },
            data: { currentRoundId: round.id },
        });
        return round;
    }
    async updateRoundStatus(roundId, status) {
        const data = { status };
        if (status === 'CLOSED')
            data.betCloseAt = new Date();
        if (status === 'DRAWING')
            data.resultAt = new Date();
        if (status === 'FINISHED')
            data.settledAt = new Date();
        await this.prisma.gameRound.update({
            where: { id: roundId },
            data,
        });
    }
    executeGame(gameCode) {
        switch (gameCode) {
            case 'baccarat':
                return baccarat_engine_1.BaccaratEngine.play();
            case 'dice':
                return dice_engine_1.DiceEngine.play();
            default:
                throw new Error(`Unknown game code: ${gameCode}`);
        }
    }
    async runCountdown(roomId, totalSeconds) {
        for (let remaining = totalSeconds; remaining > 0; remaining--) {
            this.wsService.broadcastToRoom(roomId, 'countdown_update', {
                remaining,
            });
            await this.sleep(1000);
        }
    }
    async cacheRecentResult(roomId, roundNo, result) {
        const key = `room:${roomId}:recent_results`;
        const value = JSON.stringify({ roundNo, result, time: new Date().toISOString() });
        const client = this.redisService.getClient();
        await client.lpush(key, value);
        await client.ltrim(key, 0, 49);
    }
    sleep(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
};
exports.GameLoopService = GameLoopService;
exports.GameLoopService = GameLoopService = GameLoopService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService,
        config_1.ConfigService,
        settlement_service_1.SettlementService,
        ws_service_1.WsService])
], GameLoopService);
//# sourceMappingURL=game-loop.service.js.map