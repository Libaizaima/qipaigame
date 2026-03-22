import { PrismaService } from '../prisma/prisma.service';
export declare class HistoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getRoundHistory(gameCode?: string, roomId?: string, page?: number, limit?: number): Promise<{
        items: ({
            result: {
                id: string;
                createdAt: Date;
                gameId: string;
                roundId: string;
                resultPayload: import("@prisma/client/runtime/client").JsonValue;
            } | null;
            game: {
                code: string;
                name: string;
            };
            room: {
                roomCode: string;
                roomName: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.RoundStatus;
            createdAt: Date;
            gameId: string;
            roundNo: number;
            roomId: string;
            startAt: Date | null;
            betCloseAt: Date | null;
            resultAt: Date | null;
            settledAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getBaccaratHistory(roomId?: string, page?: number, limit?: number): Promise<{
        items: ({
            result: {
                id: string;
                createdAt: Date;
                gameId: string;
                roundId: string;
                resultPayload: import("@prisma/client/runtime/client").JsonValue;
            } | null;
            game: {
                code: string;
                name: string;
            };
            room: {
                roomCode: string;
                roomName: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.RoundStatus;
            createdAt: Date;
            gameId: string;
            roundNo: number;
            roomId: string;
            startAt: Date | null;
            betCloseAt: Date | null;
            resultAt: Date | null;
            settledAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
    getDiceHistory(roomId?: string, page?: number, limit?: number): Promise<{
        items: ({
            result: {
                id: string;
                createdAt: Date;
                gameId: string;
                roundId: string;
                resultPayload: import("@prisma/client/runtime/client").JsonValue;
            } | null;
            game: {
                code: string;
                name: string;
            };
            room: {
                roomCode: string;
                roomName: string;
            };
        } & {
            id: string;
            status: import("@prisma/client").$Enums.RoundStatus;
            createdAt: Date;
            gameId: string;
            roundNo: number;
            roomId: string;
            startAt: Date | null;
            betCloseAt: Date | null;
            resultAt: Date | null;
            settledAt: Date | null;
        })[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }>;
}
