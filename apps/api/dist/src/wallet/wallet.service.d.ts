import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
export declare class WalletService {
    private prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    deductForBet(tx: Prisma.TransactionClient, userId: string, amount: number, referenceId: string): Promise<number>;
    creditForWin(tx: Prisma.TransactionClient, userId: string, amount: number, referenceId: string): Promise<number | undefined>;
    getTransactions(userId: string, page?: number, limit?: number): Promise<{
        items: {
            id: string;
            createdAt: Date;
            userId: string;
            type: import("@prisma/client").$Enums.WalletTransactionType;
            amount: Prisma.Decimal;
            beforeBalance: Prisma.Decimal;
            afterBalance: Prisma.Decimal;
            referenceType: string | null;
            referenceId: string | null;
            walletId: string;
        }[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
