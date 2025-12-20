import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Sse, UseGuards, ValidationPipe, Query,
} from '@nestjs/common';
import { map } from 'rxjs/operators';
import { Observable } from 'rxjs';

import { ConversationsService } from './conversations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { IsNotEmpty, IsString } from 'class-validator';
import { ChatGateway } from './chat.gateway';
import { getUserId } from '../auth/get-user-id.util';
import { MessageBusService } from './message-bus.service';
import { JwtService } from '@nestjs/jwt';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  text!: string;
}

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly service: ConversationsService,
    private readonly gateway: ChatGateway,
    private readonly bus: MessageBusService,
    private readonly jwt: JwtService, // ✅ διαθέσιμο λόγω global JwtModule
  ) {}

  @Post('read-all')
  async readAll(@CurrentUser() user: any) {
  const userId = getUserId(user);
  return this.service.markAllReadForUser(userId);
  }

  @Get('unread')
  async unread(@CurrentUser() user: any) {
    const userId = getUserId(user);
    return this.service.unreadCount(userId);
  }

  @Post(':id/read')
  async markRead(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const userId = getUserId(user);
    return this.service.markRead(id, userId);
  }


  @Get()
  async myConversations(@CurrentUser() user: any) {
    const userId = getUserId(user);
    return this.service.listForUser(userId);
  }

  @Get(':id/messages')
  async getMessages(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const userId = getUserId(user);
    return this.service.getMessages(id, userId);
  }

  @Post(':id/messages')
  async send(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true })) dto: SendMessageDto,
    @CurrentUser() user: any,
  ) {
    const userId = getUserId(user);
    const msg = await this.service.sendMessage(id, userId, dto.text);

    // Socket.IO (όπως πριν)
    this.gateway.emitNewMessage(id, msg);

    // ✅ SSE push (για σίγουρο real-time)
    this.bus.publish(id, { conversationId: id, message: msg });

    return msg;
  }

  /**
   * Server-Sent Events stream για συγκεκριμένη conversation.
   * Σημείωση: EventSource δεν στέλνει Authorization header,
   * περνάμε JWT ως ?token= στο query και ελέγχουμε συμμετοχή.
   */
  @Sse(':id/stream')
  async stream(
    @Param('id', ParseIntPipe) id: number,
    @Query('token') token?: string,
  ): Promise<Observable<{ data: any }>> {
    const decoded = this.jwt.verify(token || '', { ignoreExpiration: false }) as any;
    // Δέχομαι είτε sub είτε id (ανάλογα τι βάζεις στο sign)
    const uid = Number(decoded?.sub ?? decoded?.id);
    await this.service.ensureParticipant(id, uid);

    return this.bus.stream(id).pipe(map((payload) => ({ data: payload })));
  }
}