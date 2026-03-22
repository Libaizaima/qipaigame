import { PrismaService } from '../prisma/prisma.service';
import { GameLoopService } from '../game/game-loop.service';
export declare class AdminService {
    private prisma;
    private gameLoopService;
    constructor(prisma: PrismaService, gameLoopService: GameLoopService);
    getUsers(page?: number, limit?: number): Promise<{
        items: {
            id: string;
            status: import("@prisma/client").$Enums.UserStatus;
            createdAt: Date;
            username: string;
            email: string | null;
            role: import("@prisma/client").$Enums.UserRole;
            wallet: {
                balance: import("@prisma/client-runtime-utils").Decimal;
            } | null;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getBets(page?: number, limit?: number): Promise<{
        items: ({
            game: {
                code: string;
                name: string;
            };
            user: {
                username: string;
            };
            round: {
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
    getTransactions(page?: number, limit?: number): Promise<{
        items: {
            id: string;
            createdAt: Date;
            userId: string;
            type: import("@prisma/client").$Enums.WalletTransactionType;
            amount: import("@prisma/client-runtime-utils").Decimal;
            beforeBalance: import("@prisma/client-runtime-utils").Decimal;
            afterBalance: import("@prisma/client-runtime-utils").Decimal;
            referenceType: string | null;
            referenceId: string | null;
            walletId: string;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    pauseRoom(roomId: string): Promise<{
        message: string;
    }>;
    resumeRoom(roomId: string): Promise<{
        message: string;
    }>;
    toggleUserStatus(userId: string, status: 'ACTIVE' | 'BANNED'): Promise<{
        message: string;
    }>;
}
