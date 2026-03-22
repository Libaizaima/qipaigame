import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WsService } from './ws.service';
export declare class WsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private wsService;
    private jwtService;
    server: Server;
    private readonly logger;
    constructor(wsService: WsService, jwtService: JwtService);
    afterInit(server: Server): void;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleJoinRoom(client: Socket, data: {
        roomId: string;
    }): {
        event: string;
        data: {
            roomId: string;
        };
    };
    handleLeaveRoom(client: Socket, data: {
        roomId: string;
    }): {
        event: string;
        data: {
            roomId: string;
        };
    };
    handlePing(client: Socket): {
        event: string;
        data: {
            time: string;
        };
    };
}
