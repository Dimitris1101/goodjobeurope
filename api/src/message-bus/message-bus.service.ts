import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MessageBusService {
  private readonly logger = new Logger(MessageBusService.name);

  /**
   * Απλός no-op publisher. Αν θες στο μέλλον Kafka/Redis/etc, το κουμπώνεις εδώ.
   */
  async publish(topic: string, payload: unknown): Promise<void> {
    this.logger.debug(`publish -> ${topic}: ${JSON.stringify(payload)?.slice(0, 500)}`);
    // no-op
  }
}