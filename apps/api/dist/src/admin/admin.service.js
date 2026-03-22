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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const game_loop_service_1 = require("../game/game-loop.service");
let AdminService = class AdminService {
    prisma;
    gameLoopService;
    constructor(prisma, gameLoopService) {
        this.prisma = prisma;
        this.gameLoopService = gameLoopService;
    }
    async getUsers(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [users, total] = await Promise.all([
            this.prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    status: true,
                    createdAt: true,
                    wallet: { select: { balance: true } },
                },
            }),
            this.prisma.user.count(),
        ]);
        return { items: users, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async getBets(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [bets, total] = await Promise.all([
            this.prisma.bet.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: { select: { username: true } },
                    game: { select: { code: true, name: true } },
                    round: { select: { roundNo: true } },
                },
            }),
            this.prisma.bet.count(),
        ]);
        return { items: bets, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async getTransactions(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const [txs, total] = await Promise.all([
            this.prisma.walletTransaction.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.walletTransaction.count(),
        ]);
        return { items: txs, total, page, limit, totalPages: Math.ceil(total / limit) };
    }
    async pauseRoom(roomId) {
        this.gameLoopService.stopRoomLoop(roomId);
        await this.prisma.gameRoom.update({
            where: { id: roomId },
            data: { status: 'PAUSED' },
        });
        return { message: '房间已暂停' };
    }
    async resumeRoom(roomId) {
        const room = await this.prisma.gameRoom.update({
            where: { id: roomId },
            data: { status: 'ACTIVE' },
        });
        const gameRoom = await this.prisma.gameRoom.findUnique({
            where: { id: roomId },
            include: { game: true },
        });
        if (gameRoom) {
            this.gameLoopService.startRoomLoop(roomId, gameRoom.game.code, gameRoom.bettingSeconds);
        }
        return { message: '房间已恢复' };
    }
    async toggleUserStatus(userId, status) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { status },
        });
        return { message: `用户状态已更新为 ${status}` };
    }
};
exports.AdminService = AdminService;
exports.AdminService = AdminService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        game_loop_service_1.GameLoopService])
], AdminService);
//# sourceMappingURL=admin.service.js.map