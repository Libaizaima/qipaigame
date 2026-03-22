import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 下注扣款（在事务内调用）
   */
  async deductForBet(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    referenceId: string,
  ) {
    // 使用 FOR UPDATE 锁定钱包行
    const wallets = await tx.$queryRaw<any[]>`
      SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;
    const wallet = wallets[0];

    if (!wallet) {
      throw new BadRequestException('钱包不存在');
    }

    const currentBalance = Number(wallet.balance);
    if (currentBalance < amount) {
      throw new BadRequestException('余额不足');
    }

    const newBalance = currentBalance - amount;

    // 更新余额
    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    // 写入账变流水
    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type: 'BET_PLACE',
        amount: -amount,
        beforeBalance: currentBalance,
        afterBalance: newBalance,
        referenceType: 'BET',
        referenceId,
      },
    });

    return newBalance;
  }

  /**
   * 中奖派奖（在事务内调用）
   */
  async creditForWin(
    tx: Prisma.TransactionClient,
    userId: string,
    amount: number,
    referenceId: string,
  ) {
    const wallets = await tx.$queryRaw<any[]>`
      SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
    `;
    const wallet = wallets[0];

    if (!wallet) {
      this.logger.error(`Wallet not found for user ${userId}`);
      return;
    }

    const currentBalance = Number(wallet.balance);
    const newBalance = currentBalance + amount;

    await tx.wallet.update({
      where: { userId },
      data: { balance: newBalance },
    });

    await tx.walletTransaction.create({
      data: {
        userId,
        walletId: wallet.id,
        type: 'BET_WIN',
        amount,
        beforeBalance: currentBalance,
        afterBalance: newBalance,
        referenceType: 'BET_WIN',
        referenceId,
      },
    });

    return newBalance;
  }

  /**
   * 管理员调整积分（加/减）
   */
  async adminAdjust(
    userId: string,
    amount: number,
    reason: string,
    operatorId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // 锁定钱包行
      const wallets = await tx.$queryRaw<any[]>`
        SELECT * FROM wallets WHERE user_id = ${userId} FOR UPDATE
      `;
      const wallet = wallets[0];

      if (!wallet) {
        throw new BadRequestException('钱包不存在');
      }

      const currentBalance = Number(wallet.balance);
      const newBalance = currentBalance + amount;

      if (newBalance < 0) {
        throw new BadRequestException(`余额不足，当前余额: ${currentBalance}`);
      }

      // 更新余额
      await tx.wallet.update({
        where: { userId },
        data: { balance: newBalance },
      });

      // 写入账变流水
      const referenceId = `admin_${operatorId}_${Date.now()}`;
      await tx.walletTransaction.create({
        data: {
          userId,
          walletId: wallet.id,
          type: 'ADMIN_ADJUST',
          amount,
          beforeBalance: currentBalance,
          afterBalance: newBalance,
          referenceType: 'ADMIN_ADJUST',
          referenceId,
        },
      });

      // 写入操作日志
      await tx.operationLog.create({
        data: {
          operator: operatorId,
          action: 'ADJUST_BALANCE',
          target: userId,
          detail: { amount, reason, beforeBalance: currentBalance, afterBalance: newBalance },
        },
      });

      this.logger.log(
        `Admin ${operatorId} adjusted user ${userId} balance: ${currentBalance} -> ${newBalance} (${amount > 0 ? '+' : ''}${amount}), reason: ${reason}`,
      );

      return { beforeBalance: currentBalance, afterBalance: newBalance, amount };
    });
  }

  /**
   * 查询账变流水
   */
  async getTransactions(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      this.prisma.walletTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where: { userId } }),
    ]);

    return {
      items: transactions,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
