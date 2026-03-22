import { PrismaService } from '../prisma/prisma.service';
export declare class UserService {
    private prisma;
    constructor(prisma: PrismaService);
    getProfile(userId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.UserStatus;
        createdAt: Date;
        username: string;
        email: string | null;
        role: import("@prisma/client").$Enums.UserRole;
        wallet: {
            balance: import("@prisma/client-runtime-utils").Decimal;
            frozenBalance: import("@prisma/client-runtime-utils").Decimal;
        } | null;
    }>;
    getBalance(userId: string): Promise<{
        balance: import("@prisma/client-runtime-utils").Decimal;
        frozenBalance: import("@prisma/client-runtime-utils").Decimal;
    }>;
}
