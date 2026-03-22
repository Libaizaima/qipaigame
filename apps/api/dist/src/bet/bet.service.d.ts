import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { WsService } from '../ws/ws.service';
import { PlaceBetDto } from './dto';
export declare class BetService {
    private prisma;
    private walletService;
    private wsService;
    private readonly logger;
    constructor(prisma: PrismaService, walletService: WalletService, wsService: WsService);
    placeBet(userId: string, dto: PlaceBetDto): Promise<{
        betId: string;
        message: string;
        remainingBalance?: undefined;
    } | {
        betId: string;
        remainingBalance: number;
        message: string;
    }>;
    getMyBets(userId: string, page?: number, limit?: number): Promise<{
        items: ({
            game: {
                code: string;
                name: string;
            };
            round: {
                status: import("@prisma/client").$Enums.RoundStatus;
                roundNo: number;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.BetStatus;
            createdAt: Date;
            gameId: string;
            userId: string;
            roomId: string;
            roundId: string;
            betType: string;
            betAmount: import("@prisma/client-runtime-utils").Decimal;
            odds: import("@prisma/client-runtime-utils").Decimal;
            payoutAmount: import("@prisma/client-runtime-utils").Decimal | null;
            idempotencyKey: string | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
