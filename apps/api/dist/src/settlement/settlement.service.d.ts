import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { WsService } from '../ws/ws.service';
export declare class SettlementService {
    private prisma;
    private redisService;
    private walletService;
    private wsService;
    private readonly logger;
    constructor(prisma: PrismaService, redisService: RedisService, walletService: WalletService, wsService: WsService);
    settleRound(roundId: string, gameCode: string, result: any): Promise<void>;
    private settleBet;
}
