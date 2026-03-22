import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { WsService } from './ws.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/',
})
export class WsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WsGateway.name);

  constructor(
    private wsService: WsService,
    private jwtService: JwtService,
  ) {}

  afterInit(server: Server) {
    this.wsService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      // 从握手时的 auth token 或 query 验证用户
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify(token);
        const userId = payload.sub;
        this.wsService.registerUser(userId, client.id);
        this.logger.log(`User ${userId} connected (socket: ${client.id})`);
      } else {
        this.logger.log(`Anonymous socket connected: ${client.id}`);
      }
    } catch (error) {
      this.logger.warn(`Invalid token for socket ${client.id}`);
      // 不断开，允许匿名访问观看（但不能下注）
    }
  }

  handleDisconnect(client: Socket) {
    this.wsService.removeSocket(client.id);
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  /**
   * 客户端加入房间
   */
  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const roomChannel = `room:${data.roomId}`;
    client.join(roomChannel);
    this.logger.log(`Socket ${client.id} joined room ${data.roomId}`);
    return { event: 'joined_room', data: { roomId: data.roomId } };
  }

  /**
   * 客户端离开房间
   */
  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string },
  ) {
    const roomChannel = `room:${data.roomId}`;
    client.leave(roomChannel);
    this.logger.log(`Socket ${client.id} left room ${data.roomId}`);
    return { event: 'left_room', data: { roomId: data.roomId } };
  }

  /**
   * 心跳
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    return { event: 'pong', data: { time: new Date().toISOString() } };
  }
}
