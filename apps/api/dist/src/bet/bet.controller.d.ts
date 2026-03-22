import { BetService } from './bet.service';
import { PlaceBetDto } from './dto';
export declare class BetController {
    private readonly betService;
    constructor(betService: BetService);
    placeBet(userId: string, dto: PlaceBetDto): Promise<{
        betId: string;
        message: string;
        remainingBalance?: undefined;
    } | {
        betId: string;
        remainingBalance: number;
        message: string;
    }>;
    getMyBets(userId: string, page?: string, limit?: string): Promise<{
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
