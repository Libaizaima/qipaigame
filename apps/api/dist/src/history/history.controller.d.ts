import { HistoryService } from './history.service';
export declare class HistoryController {
    private readonly historyService;
    constructor(historyService: HistoryService);
    getRoundHistory(game?: string, roomId?: string, page?: string, limit?: string): Promise<{
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
    getBaccaratHistory(roomId?: string, page?: string, limit?: string): Promise<{
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
    getDiceHistory(roomId?: string, page?: string, limit?: string): Promise<{
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
