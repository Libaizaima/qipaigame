import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HistoryService {
  constructor(private prisma: PrismaService) {}

  /**
   * 查看历史局结果
   */
  async getRoundHistory(
    gameCode?: string,
    roomId?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { status: 'FINISHED' };

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

  /**
   * 查看百家乐历史
   */
  async getBaccaratHistory(roomId?: string, page: number = 1, limit: number = 20) {
    return this.getRoundHistory('baccarat', roomId, page, limit);
  }

  /**
   * 查看骰子历史
   */
  async getDiceHistory(roomId?: string, page: number = 1, limit: number = 20) {
    return this.getRoundHistory('dice', roomId, page, limit);
  }
}
