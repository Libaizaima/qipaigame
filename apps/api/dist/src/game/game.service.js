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
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const redis_service_1 = require("../redis/redis.service");
let GameService = class GameService {
    prisma;
    redisService;
    constructor(prisma, redisService) {
        this.prisma = prisma;
        this.redisService = redisService;
    }
    async getGames() {
        return this.prisma.game.findMany({
            where: { status: 'ACTIVE' },
            select: {
                id: true,
                code: true,
                name: true,
                status: true,
            },
        });
    }
    async getRooms(gameCode) {
        const where = { status: 'ACTIVE' };
        if (gameCode) {
            where.game = { code: gameCode };
        }
        return this.prisma.gameRoom.findMany({
            where,
            include: {
                game: {
                    select: {
                        code: true,
                        name: true,
                    },
                },
            },
        });
    }
    async getRoomDetail(roomId) {
        const room = await this.prisma.gameRoom.findUnique({
            where: { id: roomId },
            include: {
                game: true,
                rounds: {
                    orderBy: { roundNo: 'desc' },
                    take: 1,
                    include: {
                        result: true,
                    },
                },
            },
        });
        const recentResults = await this.getRecentResults(roomId);
        return {
            ...room,
            recentResults,
        };
    }
    async getRecentResults(roomId, count = 20) {
        const key = `room:${roomId}:recent_results`;
        const client = this.redisService.getClient();
        const results = await client.lrange(key, 0, count - 1);
        return results.map((r) => JSON.parse(r));
    }
};
exports.GameService = GameService;
exports.GameService = GameService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        redis_service_1.RedisService])
], GameService);
//# sourceMappingURL=game.service.js.map