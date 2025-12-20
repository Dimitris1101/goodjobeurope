import { Module } from '@nestjs/common';
import { MessageBusService } from './message-bus.service';

@Module({
  providers: [MessageBusService],
  exports: [MessageBusService],
})
export class MessageBusModule {}