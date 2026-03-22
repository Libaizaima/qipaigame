"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsService = void 0;
const common_1 = require("@nestjs/common");
let WsService = WsService_1 = class WsService {
    logger = new common_1.Logger(WsService_1.name);
    server = null;
    userSockets = new Map();
    socketUsers = new Map();
    setServer(server) {
        this.server = server;
    }
    registerUser(userId, socketId) {
        if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
        }
        this.userSockets.get(userId).add(socketId);
        this.socketUsers.set(socketId, userId);
    }
    removeSocket(socketId) {
        const userId = this.socketUsers.get(socketId);
        if (userId) {
            this.userSockets.get(userId)?.delete(socketId);
            if (this.userSockets.get(userId)?.size === 0) {
                this.userSockets.delete(userId);
            }
        }
        this.socketUsers.delete(socketId);
    }
    broadcastToRoom(roomId, event, data) {
        if (this.server) {
            this.server.to(`room:${roomId}`).emit(event, data);
        }
    }
    sendToUser(userId, event, data) {
        const sockets = this.userSockets.get(userId);
        if (sockets && this.server) {
            for (const socketId of sockets) {
                this.server.to(socketId).emit(event, data);
            }
        }
    }
    broadcastAll(event, data) {
        if (this.server) {
            this.server.emit(event, data);
        }
    }
};
exports.WsService = WsService;
exports.WsService = WsService = WsService_1 = __decorate([
    (0, common_1.Injectable)()
], WsService);
//# sourceMappingURL=ws.service.js.map