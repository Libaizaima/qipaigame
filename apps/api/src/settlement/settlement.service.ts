import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { WsService } from '../ws/ws.service';
import { BaccaratEngine, BaccaratResult } from '../game/engines/baccarat.engine';
import { DiceEngine, DiceResult } from '../game/engines/dice.engine';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private walletService: WalletService,
    private wsService: WsService,
  ) {}

  /**
   * 结算一局
   */
  async settleRound(roundId: string, gameCode: string, result: any) {
    const lockKey = `settlement:lock:${roundId}`;

    // 分布式锁防止重复结算
    const acquired = await this.redisService.acquireLock(lockKey, 60);
    if (!acquired) {
      this.logger.warn(`Settlement already in progress for round ${roundId}`);
      return;
    }

    try {
      // 检查是否已结算
      const round = await this.prisma.gameRound.findUnique({
        where: { id: roundId },
      });
      if (round?.status === 'FINISHED') {
        this.logger.warn(`Round ${roundId} already settled`);
        return;
      }

      // 查询所有待结算的下注
      const bets = await this.prisma.bet.findMany({
        where: {
          roundId,
          status: 'PENDING',
        },
      });

      this.logger.log(`Settling ${bets.length} bets for round ${roundId}`);

      // 逐笔结算（在事务中）
      for (const bet of bets) {
        await this.settleBet(bet, gameCode, result);
      }

      this.logger.log(`Round ${roundId} settlement complete`);
    } catch (error) {
      this.logger.error(`Settlement error for round ${roundId}:`, error);
      throw error;
    } finally {
      await this.redisService.releaseLock(lockKey);
    }
  }

  /**
   * 结算单笔下注
   */
  private async settleBet(bet: any, gameCode: string, result: any) {
    let payoutAmount = 0;
    let status: 'WON' | 'LOST' = 'LOST';

    if (gameCode === 'baccarat') {
      payoutAmount = BaccaratEngine.calculatePayout(
        bet.betType,
        Number(bet.betAmount),
        result as BaccaratResult,
      );
    } else if (gameCode === 'dice') {
      payoutAmount = DiceEngine.calculatePayout(
        bet.betType,
        Number(bet.betAmount),
        result as DiceResult,
      );
    }

    // 百家乐特殊处理：和局时庄/闲退还本金
    const baccaratResult = result as BaccaratResult;
    const isTiePush =
      gameCode === 'baccarat' &&
      baccaratResult.winner === 'tie' &&
      (bet.betType === 'player' || bet.betType === 'banker');

    if (payoutAmount > 0) {
      status = isTiePush ? 'LOST' : 'WON'; // 和局退本金算作特殊处理
      if (isTiePush) status = 'WON'; // 实际是退还本金，标记为 WON

      await this.prisma.$transaction(async (tx) => {
        // 更新下注状态
        await tx.bet.update({
          where: { id: bet.id },
          data: { status, payoutAmount },
        });

        // 派奖
        await this.walletService.creditForWin(
          tx,
          bet.userId,
          payoutAmount,
          bet.id,
        );
      });

      // 通知用户余额变化
      this.wsService.sendToUser(bet.userId, 'wallet_updated', {
        type: isTiePush ? 'refund' : 'win',
        amount: payoutAmount,
        betId: bet.id,
      });
    } else {
      // 输了
      await this.prisma.bet.update({
        where: { id: bet.id },
        data: { status: 'LOST', payoutAmount: 0 },
      });
    }
  }
}
