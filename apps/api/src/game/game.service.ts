import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class GameService {
  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
  ) {}

  /**
   * 获取所有游戏列表
   */
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

  /**
   * 获取所有房间列表
   */
  async getRooms(gameCode?: string) {
    const where: any = { status: 'ACTIVE' };
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

  /**
   * 获取房间详情（包含当前局信息）
   */
  async getRoomDetail(roomId: string) {
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

    // 从 Redis 获取最近结果缓存
    const recentResults = await this.getRecentResults(roomId);

    return {
      ...room,
      recentResults,
    };
  }

  /**
   * 从 Redis 获取最近的游戏结果
   */
  async getRecentResults(roomId: string, count: number = 20): Promise<any[]> {
    const key = `room:${roomId}:recent_results`;
    const client = this.redisService.getClient();
    const results = await client.lrange(key, 0, count - 1);
    return results.map((r) => JSON.parse(r));
  }
}
