import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Injectable } from '@nestjs/common';

const roomConv = (id: number) => `conv:${id}`;
const roomUser = (id: number) => `user:${id}`;

// Αντί για Set, κρατάμε counters ώστε να υποστηρίζει πολλά tabs ανά user
const userConnCount = new Map<number, number>();

@WebSocketGateway({
  namespace: '/ws/chat',
  cors: { origin: ['http://localhost:3000'], credentials: true },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  constructor(private readonly jwt: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.query?.token as string | undefined;
      if (token) {
        const payload: any = this.jwt.verify(token);
        const uid = Number(payload?.sub || payload?.id);
        if (uid) {
          client.data.userId = uid;
          client.join(roomUser(uid));

          const cur = userConnCount.get(uid) ?? 0;
          userConnCount.set(uid, cur + 1);
        }
      }
    } catch {
      // αν το token δεν κάνει verify, συνεχίζουμε "ανώνυμα"
    }
  }

  handleDisconnect(client: Socket) {
    const uid = Number(client.data?.userId);
    if (!uid) return;

    const cur = userConnCount.get(uid) ?? 0;
    const next = Math.max(0, cur - 1);
    if (next === 0) userConnCount.delete(uid);
    else userConnCount.set(uid, next);
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: number }) {
    const r = roomConv(Number(data?.conversationId));
    client.join(r);
    client.emit('joined', { room: r });
  }

  emitBadgeUpdate(targetUserId: number, payload: { total: number; byConversation?: Record<number, number> }) {
    this.server.to(roomUser(targetUserId)).emit('badge:update', payload);
  }

  emitNewMessage(conversationId: number, message: any) {
    this.server.to(roomConv(conversationId)).emit('message:new', { conversationId, message });
  }

  isUserOnline(userId: number) {
    return (userConnCount.get(userId) ?? 0) > 0;
  }
}