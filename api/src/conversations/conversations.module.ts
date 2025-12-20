import { Module } from '@nestjs/common';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { PrismaService } from '../prisma.service';
import { ChatGateway } from './chat.gateway';
import { MailerModule } from '../mailer/mailer.module';
import { MessageBusModule } from './message-bus.module';

@Module({
  imports: [MailerModule, MessageBusModule],
  controllers: [ConversationsController],
  providers: [PrismaService, ConversationsService, ChatGateway],
  exports: [ConversationsService],
})
export class ConversationsModule {}