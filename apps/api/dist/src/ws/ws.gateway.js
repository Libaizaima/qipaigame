"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const socket_io_1 = require("socket.io");
const jwt_1 = require("@nestjs/jwt");
const ws_service_1 = require("./ws.service");
let WsGateway = WsGateway_1 = class WsGateway {
    wsService;
    jwtService;
    server;
    logger = new common_1.Logger(WsGateway_1.name);
    constructor(wsService, jwtService) {
        this.wsService = wsService;
        this.jwtService = jwtService;
    }
    afterInit(server) {
        this.wsService.setServer(server);
        this.logger.log('WebSocket Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const token = client.handshake.auth?.token ||
                client.handshake.headers?.authorization?.replace('Bearer ', '');
            if (token) {
                const payload = this.jwtService.verify(token);
                const userId = payload.sub;
                this.wsService.registerUser(userId, client.id);
                this.logger.log(`User ${userId} connected (socket: ${client.id})`);
            }
            else {
                this.logger.log(`Anonymous socket connected: ${client.id}`);
            }
        }
        catch (error) {
            this.logger.warn(`Invalid token for socket ${client.id}`);
        }
    }
    handleDisconnect(client) {
        this.wsService.removeSocket(client.id);
        this.logger.log(`Socket disconnected: ${client.id}`);
    }
    handleJoinRoom(client, data) {
        const roomChannel = `room:${data.roomId}`;
        client.join(roomChannel);
        this.logger.log(`Socket ${client.id} joined room ${data.roomId}`);
        return { event: 'joined_room', data: { roomId: data.roomId } };
    }
    handleLeaveRoom(client, data) {
        const roomChannel = `room:${data.roomId}`;
        client.leave(roomChannel);
        this.logger.log(`Socket ${client.id} left room ${data.roomId}`);
        return { event: 'left_room', data: { roomId: data.roomId } };
    }
    handlePing(client) {
        return { event: 'pong', data: { time: new Date().toISOString() } };
    }
};
exports.WsGateway = WsGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], WsGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], WsGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('leave_room'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], WsGateway.prototype, "handleLeaveRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('ping'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], WsGateway.prototype, "handlePing", null);
exports.WsGateway = WsGateway = WsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        namespace: '/',
    }),
    __metadata("design:paramtypes", [ws_service_1.WsService,
        jwt_1.JwtService])
], WsGateway);
//# sourceMappingURL=ws.gateway.js.map