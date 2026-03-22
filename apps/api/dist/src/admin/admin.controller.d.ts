import { AdminService } from './admin.service';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    getUsers(page?: string, limit?: string): Promise<{
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
    getBets(page?: string, limit?: string): Promise<{
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
    getTransactions(page?: string, limit?: string): Promise<{
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
    pauseRoom(id: string): Promise<{
        message: string;
    }>;
    resumeRoom(id: string): Promise<{
        message: string;
    }>;
    banUser(id: string): Promise<{
        message: string;
    }>;
    activateUser(id: string): Promise<{
        message: string;
    }>;
}
