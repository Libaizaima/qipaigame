import { GameService } from './game.service';
export declare class GameController {
    private readonly gameService;
    constructor(gameService: GameService);
    getGames(): Promise<{
        id: string;
        code: string;
        name: string;
        status: import("@prisma/client").$Enums.GameStatus;
    }[]>;
    getRooms(gameCode?: string): Promise<({
        game: {
            code: string;
            name: string;
        };
    } & {
        id: string;
        status: import("@prisma/client").$Enums.RoomStatus;
        createdAt: Date;
        roomCode: string;
        gameId: string;
        roomName: string;
        currentRoundId: string | null;
        minBet: import("@prisma/client-runtime-utils").Decimal;
        maxBet: import("@prisma/client-runtime-utils").Decimal;
        bettingSeconds: number;
        updatedAt: Date;
    })[]>;
    getRoomDetail(id: string): Promise<{
        recentResults: any[];
        rounds?: ({
            result: {
                id: string;
                createdAt: Date;
                gameId: string;
                roundId: string;
                resultPayload: import("@prisma/client/runtime/client").JsonValue;
            } | null;
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
        })[] | undefined;
        game?: {
            id: string;
            code: string;
            name: string;
            status: import("@prisma/client").$Enums.GameStatus;
            createdAt: Date;
        } | undefined;
        id?: string | undefined;
        status?: import("@prisma/client").$Enums.RoomStatus | undefined;
        createdAt?: Date | undefined;
        roomCode?: string | undefined;
        gameId?: string | undefined;
        roomName?: string | undefined;
        currentRoundId?: string | null | undefined;
        minBet?: import("@prisma/client-runtime-utils").Decimal | undefined;
        maxBet?: import("@prisma/client-runtime-utils").Decimal | undefined;
        bettingSeconds?: number | undefined;
        updatedAt?: Date | undefined;
    }>;
}
