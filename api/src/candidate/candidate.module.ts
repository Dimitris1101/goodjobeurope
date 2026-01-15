import { Module } from '@nestjs/common';
import { CandidateController } from './candidate.controller';
import { CandidateService } from './candidate.service';
import { PrismaService } from '../prisma.service';
import { R2Service } from '../r2/r2.service';

@Module({
  controllers: [CandidateController],
  providers: [CandidateService, PrismaService, R2Service],
  exports: [CandidateService],
})
export class CandidateModule {}