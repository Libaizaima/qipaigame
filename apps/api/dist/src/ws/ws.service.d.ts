import { Server } from 'socket.io';
export declare class WsService {
    private readonly logger;
    private server;
    private userSockets;
    private socketUsers;
    setServer(server: Server): void;
    registerUser(userId: string, socketId: string): void;
    removeSocket(socketId: string): void;
    broadcastToRoom(roomId: string, event: string, data: any): void;
    sendToUser(userId: string, event: string, data: any): void;
    broadcastAll(event: string, data: any): void;
}
