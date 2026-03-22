import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GameLoopService } from '../game/game-loop.service';
import { WalletService } from '../wallet/wallet.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private gameLoopService: GameLoopService,
    private walletService: WalletService,
  ) {}

  /**
   * 查看用户列表
   */
  async getUsers(page: number = 1, limit: number = 20) {
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

  /**
   * 查看所有下注记录
   */
  async getBets(page: number = 1, limit: number = 20) {
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

  /**
   * 查看账变流水
   */
  async getTransactions(page: number = 1, limit: number = 20) {
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

  /**
   * 调整用户积分
   */
  async adjustBalance(userId: string, amount: number, reason: string, operatorId: string) {
    if (amount === 0) {
      throw new BadRequestException('调整金额不能为 0');
    }
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('请填写调整原因');
    }
    return this.walletService.adminAdjust(userId, amount, reason.trim(), operatorId);
  }

  /**
   * 暂停房间
   */
  async pauseRoom(roomId: string) {
    this.gameLoopService.stopRoomLoop(roomId);
    await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { status: 'PAUSED' },
    });
    return { message: '房间已暂停' };
  }

  /**
   * 恢复房间
   */
  async resumeRoom(roomId: string) {
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

  /**
   * 封禁/启用用户
   */
  async toggleUserStatus(userId: string, status: 'ACTIVE' | 'BANNED') {
    await this.prisma.user.update({
      where: { id: userId },
      data: { status },
    });
    return { message: `用户状态已更新为 ${status}` };
  }
}
