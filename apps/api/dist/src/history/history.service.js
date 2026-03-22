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
exports.HistoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let HistoryService = class HistoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getRoundHistory(gameCode, roomId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const where = { status: 'FINISHED' };
        if (gameCode) {
            where.game = { code: gameCode };
        }
        if (roomId) {
            where.roomId = roomId;
        }
        const [rounds, total] = await Promise.all([
            this.prisma.gameRound.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit,
                include: {
                    game: { select: { code: true, name: true } },
                    room: { select: { roomCode: true, roomName: true } },
                    result: true,
                },
            }),
            this.prisma.gameRound.count({ where }),
        ]);
        return {
            items: rounds,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
    async getBaccaratHistory(roomId, page = 1, limit = 20) {
        return this.getRoundHistory('baccarat', roomId, page, limit);
    }
    async getDiceHistory(roomId, page = 1, limit = 20) {
        return this.getRoundHistory('dice', roomId, page, limit);
    }
};
exports.HistoryService = HistoryService;
exports.HistoryService = HistoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], HistoryService);
//# sourceMappingURL=history.service.js.map