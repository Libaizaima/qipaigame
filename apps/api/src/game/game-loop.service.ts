import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { BaccaratEngine } from './engines/baccarat.engine';
import { DiceEngine } from './engines/dice.engine';
import { SettlementService } from '../settlement/settlement.service';
import { WsService } from '../ws/ws.service';

/**
 * 游戏循环服务
 * 负责驱动每个房间的状态机自动流转
 */
@Injectable()
export class GameLoopService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GameLoopService.name);
  private readonly roomTimers = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private configService: ConfigService,
    private settlementService: SettlementService,
    private wsService: WsService,
  ) {}

  async onModuleInit() {
    // 启动时初始化所有活跃房间的游戏循环
    await this.initializeRooms();
  }

  onModuleDestroy() {
    // 清理所有定时器
    this.stopAllLoops();
  }

  /**
   * 初始化所有活跃房间
   */
  async initializeRooms() {
    const rooms = await this.prisma.gameRoom.findMany({
      where: { status: 'ACTIVE' },
      include: { game: true },
    });

    for (const room of rooms) {
      this.startRoomLoop(room.id, room.game.code, room.bettingSeconds);
    }

    this.isRunning = true;
    this.logger.log(`Initialized ${rooms.length} room loops`);
  }

  /**
   * 启动单个房间的游戏循环
   */
  startRoomLoop(roomId: string, gameCode: string, bettingSeconds: number) {
    if (this.roomTimers.has(roomId)) {
      return; // 防止重复启动
    }

    this.logger.log(`Starting game loop for room ${roomId} (${gameCode})`);
    this.runRound(roomId, gameCode, bettingSeconds);
  }

  /**
   * 停止单个房间的游戏循环
   */
  stopRoomLoop(roomId: string) {
    const timer = this.roomTimers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.roomTimers.delete(roomId);
      this.logger.log(`Stopped game loop for room ${roomId}`);
    }
  }

  /**
   * 停止所有游戏循环
   */
  stopAllLoops() {
    for (const [roomId, timer] of this.roomTimers) {
      clearTimeout(timer);
    }
    this.roomTimers.clear();
    this.isRunning = false;
  }

  /**
   * 执行单局游戏流程
   */
  private async runRound(roomId: string, gameCode: string, bettingSeconds: number) {
    try {
      // 1. 创建新局
      const round = await this.createNewRound(roomId, gameCode);
      this.logger.log(`Round ${round.roundNo} created for room ${roomId}`);

      // 广播新局开始
      this.wsService.broadcastToRoom(roomId, 'round_start', {
        roundId: round.id,
        roundNo: round.roundNo,
        bettingSeconds,
        status: 'BETTING',
      });

      // 2. 进入下注阶段，倒计时
      await this.updateRoundStatus(round.id, 'BETTING');

      // 倒计时广播
      await this.runCountdown(roomId, bettingSeconds);

      // 3. 截止下注
      await this.updateRoundStatus(round.id, 'CLOSED');
      this.wsService.broadcastToRoom(roomId, 'round_closed', {
        roundId: round.id,
        roundNo: round.roundNo,
      });

      // 小暂停让前端展示截止
      await this.sleep(1000);

      // 4. 开奖
      await this.updateRoundStatus(round.id, 'DRAWING');
      const result = this.executeGame(gameCode);

      // 保存结果
      const room = await this.prisma.gameRoom.findUnique({ where: { id: roomId } });
      await this.prisma.roundResult.create({
        data: {
          roundId: round.id,
          gameId: room!.gameId,
          resultPayload: result,
        },
      });

      await this.updateRoundStatus(round.id, 'SETTLING');

      // 广播结果
      this.wsService.broadcastToRoom(roomId, 'round_result', {
        roundId: round.id,
        roundNo: round.roundNo,
        result,
      });

      // 5. 结算
      await this.settlementService.settleRound(round.id, gameCode, result);
      await this.updateRoundStatus(round.id, 'FINISHED');

      // 缓存最近结果到 Redis
      await this.cacheRecentResult(roomId, round.roundNo, result);

      // 等待一会后进入下一局
      await this.sleep(3000);

    } catch (error) {
      this.logger.error(`Error in game loop for room ${roomId}:`, error);
      await this.sleep(5000); // 出错后等5秒再重试
    }

    // 检查房间是否还在活跃
    const room = await this.prisma.gameRoom.findUnique({ where: { id: roomId } });
    if (room && room.status === 'ACTIVE') {
      // 安排下一局
      const timer = setTimeout(() => {
        this.runRound(roomId, gameCode, bettingSeconds);
      }, 500);
      this.roomTimers.set(roomId, timer);
    } else {
      this.roomTimers.delete(roomId);
      this.logger.log(`Room ${roomId} is no longer active, stopping loop`);
    }
  }

  /**
   * 创建新的一局
   */
  private async createNewRound(roomId: string, gameCode: string) {
    const room = await this.prisma.gameRoom.findUnique({
      where: { id: roomId },
    });

    // 获取最新局号
    const lastRound = await this.prisma.gameRound.findFirst({
      where: { roomId },
      orderBy: { roundNo: 'desc' },
    });

    const roundNo = (lastRound?.roundNo ?? 0) + 1;

    const round = await this.prisma.gameRound.create({
      data: {
        gameId: room!.gameId,
        roomId,
        roundNo,
        status: 'WAITING',
        startAt: new Date(),
      },
    });

    // 更新房间当前局
    await this.prisma.gameRoom.update({
      where: { id: roomId },
      data: { currentRoundId: round.id },
    });

    return round;
  }

  /**
   * 更新局状态
   */
  private async updateRoundStatus(roundId: string, status: any) {
    const data: any = { status };
    if (status === 'CLOSED') data.betCloseAt = new Date();
    if (status === 'DRAWING') data.resultAt = new Date();
    if (status === 'FINISHED') data.settledAt = new Date();

    await this.prisma.gameRound.update({
      where: { id: roundId },
      data,
    });
  }

  /**
   * 执行游戏逻辑，生成结果
   */
  private executeGame(gameCode: string): any {
    switch (gameCode) {
      case 'baccarat':
        return BaccaratEngine.play();
      case 'dice':
        return DiceEngine.play();
      default:
        throw new Error(`Unknown game code: ${gameCode}`);
    }
  }

  /**
   * 倒计时广播
   */
  private async runCountdown(roomId: string, totalSeconds: number) {
    for (let remaining = totalSeconds; remaining > 0; remaining--) {
      this.wsService.broadcastToRoom(roomId, 'countdown_update', {
        remaining,
      });
      await this.sleep(1000);
    }
  }

  /**
   * 缓存最近的游戏结果到 Redis（最多保留 50 条）
   */
  private async cacheRecentResult(roomId: string, roundNo: number, result: any) {
    const key = `room:${roomId}:recent_results`;
    const value = JSON.stringify({ roundNo, result, time: new Date().toISOString() });
    const client = this.redisService.getClient();
    await client.lpush(key, value);
    await client.ltrim(key, 0, 49); // 保留最近50条
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
