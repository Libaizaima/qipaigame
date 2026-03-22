import { WalletService } from './wallet.service';
export declare class WalletController {
    private readonly walletService;
    constructor(walletService: WalletService);
    getTransactions(userId: string, page?: string, limit?: string): Promise<{
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
}
