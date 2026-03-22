import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { BaccaratEngine, BACCARAT_BET_TYPES } from '../game/engines/baccarat.engine';
import { SoloPlayDto } from './dto';

@Injectable()
export class SoloBaccaratService {
  private readonly logger = new Logger(SoloBaccaratService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  /**
   * 单人百家乐：一次性下注 + 发牌 + 结算
   */
  async play(userId: string, dto: SoloPlayDto) {
    // 1. 校验下注
    if (!dto.bets || dto.bets.length === 0) {
      throw new BadRequestException('请至少下一注');
    }

    for (const bet of dto.bets) {
      if (!BACCARAT_BET_TYPES[bet.betType]) {
        throw new BadRequestException(`无效的下注类型: ${bet.betType}`);
      }
      if (bet.betAmount < 10) {
        throw new BadRequestException('最小下注金额: 10');
      }
      if (bet.betAmount > 50000) {
        throw new BadRequestException('最大下注金额: 50000');
      }
    }

    const totalBetAmount = dto.bets.reduce((sum, b) => sum + b.betAmount, 0);

    // 2. 获取单人百家乐房间
    const room = await this.prisma.gameRoom.findUnique({
      where: { roomCode: 'solo-baccarat-01' },
      include: { game: true },
    });

    if (!room) {
      throw new BadRequestException('单人百家乐房间未初始化');
    }

    // 3. 发牌
    const result = BaccaratEngine.play();

    // 4. 在事务中完成：扣款 + 创建局 + 创建注单 + 结算 + 返回
    const txResult = await this.prisma.$transaction(async (tx) => {
      // 锁定钱包
      const wallets = await tx.$queryRaw<any[]>`
        SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
      `;
      const wallet = wallets[0];
      if (!wallet) {
        throw new BadRequestException('钱包不存在');
      }

      let currentBalance = Number(wallet.balance);
      if (currentBalance < totalBetAmount) {
        throw new BadRequestException(`余额不足，当前: ${currentBalance}，需要: ${totalBetAmount}`);
      }

      // 获取最新局号
      const lastRound = await tx.gameRound.findFirst({
        where: { roomId: room.id },
        orderBy: { roundNo: 'desc' },
      });
      const roundNo = (lastRound?.roundNo ?? 0) + 1;

      // 创建新局
      const round = await tx.gameRound.create({
        data: {
          gameId: room.gameId,
          roomId: room.id,
          roundNo,
          status: 'FINISHED',
          startAt: new Date(),
          betCloseAt: new Date(),
          resultAt: new Date(),
          settledAt: new Date(),
        },
      });

      // 保存开奖结果
      await tx.roundResult.create({
        data: {
          roundId: round.id,
          gameId: room.gameId,
          resultPayload: result as any,
        },
      });

      // 逐笔处理下注
      const betResults: any[] = [];
      let netChange = 0;

      for (const betInput of dto.bets) {
        const odds = BACCARAT_BET_TYPES[betInput.betType].odds;
        const payoutAmount = BaccaratEngine.calculatePayout(
          betInput.betType,
          betInput.betAmount,
          result,
        );

        let status: 'WON' | 'LOST' = payoutAmount > 0 ? 'WON' : 'LOST';

        // 和局退还本金特殊处理
        const isTiePush =
          result.winner === 'tie' &&
          (betInput.betType === 'player' || betInput.betType === 'banker');

        const bet = await tx.bet.create({
          data: {
            userId,
            gameId: room.gameId,
            roomId: room.id,
            roundId: round.id,
            betType: betInput.betType,
            betAmount: betInput.betAmount,
            odds,
            status,
            payoutAmount: payoutAmount || 0,
          },
        });

        // 计算净变化：payoutAmount - betAmount（因为 payoutAmount 包含本金）
        const profit = payoutAmount - betInput.betAmount;
        netChange += profit;

        betResults.push({
          betId: bet.id,
          betType: betInput.betType,
          betTypeName: BACCARAT_BET_TYPES[betInput.betType].name,
          betAmount: betInput.betAmount,
          odds,
          status,
          payoutAmount: payoutAmount || 0,
          profit,
          isTiePush,
        });

        // 为每笔下注创建扣款流水
        const afterDeduct = currentBalance - betInput.betAmount;
        await tx.walletTransaction.create({
          data: {
            userId,
            walletId: wallet.id,
            type: 'BET_PLACE',
            amount: -betInput.betAmount,
            beforeBalance: currentBalance,
            afterBalance: afterDeduct,
            referenceType: 'BET',
            referenceId: bet.id,
          },
        });
        currentBalance = afterDeduct;

        // 如果赢了，创建派奖流水
        if (payoutAmount > 0) {
          const afterWin = currentBalance + payoutAmount;
          await tx.walletTransaction.create({
            data: {
              userId,
              walletId: wallet.id,
              type: isTiePush ? 'BET_REFUND' : 'BET_WIN',
              amount: payoutAmount,
              beforeBalance: currentBalance,
              afterBalance: afterWin,
              referenceType: isTiePush ? 'BET_REFUND' : 'BET_WIN',
              referenceId: bet.id,
            },
          });
          currentBalance = afterWin;
        }
      }

      // 更新钱包最终余额
      await tx.wallet.update({
        where: { userId },
        data: { balance: currentBalance },
      });

      return {
        roundId: round.id,
        roundNo,
        newBalance: currentBalance,
        totalBet: totalBetAmount,
        totalPayout: betResults.reduce((s, b) => s + b.payoutAmount, 0),
        netProfit: netChange,
        betResults,
      };
    });

    this.logger.log(
      `Solo baccarat: user ${userId}, round ${txResult.roundNo}, bet ${totalBetAmount}, result: ${result.winner}, net: ${txResult.netProfit}`,
    );

    return {
      ...txResult,
      result: {
        playerCards: result.playerCards,
        bankerCards: result.bankerCards,
        playerTotal: result.playerTotal,
        bankerTotal: result.bankerTotal,
        winner: result.winner,
        playerPair: result.playerPair,
        bankerPair: result.bankerPair,
      },
    };
  }

  /**
   * 查询单人百家乐历史
   */
  async getHistory(userId: string, page: number = 1, limit: number = 20) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { roomCode: 'solo-baccarat-01' },
    });
    if (!room) {
      return { items: [], total: 0, page, limit, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const [rounds, total] = await Promise.all([
      this.prisma.gameRound.findMany({
        where: {
          roomId: room.id,
          bets: { some: { userId } },
        },
        orderBy: { roundNo: 'desc' },
        skip,
        take: limit,
        include: {
          result: true,
          bets: {
            where: { userId },
          },
        },
      }),
      this.prisma.gameRound.count({
        where: {
          roomId: room.id,
          bets: { some: { userId } },
        },
      }),
    ]);

    return {
      items: rounds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
