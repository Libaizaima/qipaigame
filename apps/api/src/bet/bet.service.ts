import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WsService } from '../ws/ws.service';
import { BACCARAT_BET_TYPES } from '../game/engines/baccarat.engine';
import { DICE_BET_TYPES } from '../game/engines/dice.engine';
import { PlaceBetDto } from './dto';

@Injectable()
export class BetService {
  private readonly logger = new Logger(BetService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private wsService: WsService,
  ) {}

  /**
   * 下注
   */
  async placeBet(userId: string, dto: PlaceBetDto) {
    // 1. 查询房间和当前局
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: dto.roomId },
      include: { game: true },
    });

    if (!room) {
      throw new BadRequestException('房间不存在');
    }

    if (room.status !== 'ACTIVE') {
      throw new BadRequestException('房间已暂停');
    }

    if (!room.currentRoundId) {
      throw new BadRequestException('当前没有进行中的局');
    }

    // 2. 检查当前局是否处于下注阶段
    const round = await this.prisma.gameRound.findUnique({
      where: { id: room.currentRoundId },
    });

    if (!round || round.status !== 'BETTING') {
      throw new BadRequestException('当前不在下注时间');
    }

    // 3. 校验下注类型
    const gameCode = room.game.code;
    const validBetTypes = gameCode === 'baccarat' ? BACCARAT_BET_TYPES : DICE_BET_TYPES;
    if (!validBetTypes[dto.betType]) {
      throw new BadRequestException(`无效的下注类型: ${dto.betType}`);
    }

    // 4. 校验下注金额范围
    if (dto.betAmount < Number(room.minBet)) {
      throw new BadRequestException(`最小下注金额: ${room.minBet}`);
    }
    if (dto.betAmount > Number(room.maxBet)) {
      throw new BadRequestException(`最大下注金额: ${room.maxBet}`);
    }

    // 5. 幂等检查
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

    // 6. 事务内扣款 + 写入下注记录
    const odds = validBetTypes[dto.betType].odds;

    const result = await this.prisma.$transaction(async (tx) => {
      // 扣款
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

      const remainingBalance = await this.walletService.deductForBet(
        tx,
        userId,
        dto.betAmount,
        bet.id,
      );

      return {
        betId: bet.id,
        remainingBalance,
      };
    });

    // 7. 广播下注事件
    this.wsService.broadcastToRoom(dto.roomId, 'bet_placed', {
      userId,
      betType: dto.betType,
      betAmount: dto.betAmount,
      roundId: round.id,
    });

    this.logger.log(
      `User ${userId} placed bet: ${dto.betType} $${dto.betAmount} in round ${round.roundNo}`,
    );

    return {
      betId: result.betId,
      remainingBalance: result.remainingBalance,
      message: '下注成功',
    };
  }

  /**
   * 查询用户的下注记录
   */
  async getMyBets(userId: string, page: number = 1, limit: number = 20) {
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
}
