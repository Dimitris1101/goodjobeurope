import { Body, Controller, Post } from '@nestjs/common';
import { TranslationService } from './translation.service';

@Controller('translate')
export class TranslationController {
  constructor(private readonly svc: TranslationService) {}

  @Post()
  async translate(@Body() body: { texts: string[]; target: string; source?: string }) {
    const { texts, target, source } = body || {};
    const translated = await this.svc.translateBatch({ texts, target, source });
    return { translated };
  }
}
