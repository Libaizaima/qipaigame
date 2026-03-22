import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class WsService {
  private readonly logger = new Logger(WsService.name);
  private server: Server | null = null;

  // 用户ID -> Socket映射
  private userSockets = new Map<string, Set<string>>();
  // Socket -> 用户ID映射
  private socketUsers = new Map<string, string>();

  setServer(server: Server) {
    this.server = server;
  }

  /**
   * 注册用户-socket映射
   */
  registerUser(userId: string, socketId: string) {
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(socketId);
    this.socketUsers.set(socketId, userId);
  }

  /**
   * 移除用户-socket映射
   */
  removeSocket(socketId: string) {
    const userId = this.socketUsers.get(socketId);
    if (userId) {
      this.userSockets.get(userId)?.delete(socketId);
      if (this.userSockets.get(userId)?.size === 0) {
        this.userSockets.delete(userId);
      }
    }
    this.socketUsers.delete(socketId);
  }

  /**
   * 向房间广播事件
   */
  broadcastToRoom(roomId: string, event: string, data: any) {
    if (this.server) {
      this.server.to(`room:${roomId}`).emit(event, data);
    }
  }

  /**
   * 向指定用户发送事件
   */
  sendToUser(userId: string, event: string, data: any) {
    const sockets = this.userSockets.get(userId);
    if (sockets && this.server) {
      for (const socketId of sockets) {
        this.server.to(socketId).emit(event, data);
      }
    }
  }

  /**
   * 向所有连接广播
   */
  broadcastAll(event: string, data: any) {
    if (this.server) {
      this.server.emit(event, data);
    }
  }
}
