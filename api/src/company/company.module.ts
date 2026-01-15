import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { PrismaService } from '../prisma.service';
import { LocationModule } from '../location/location.module';
import { R2Module } from '../r2/r2.module';

@Module({
  imports: [LocationModule, R2Module],
  controllers: [CompanyController],
  providers: [CompanyService, PrismaService],
  exports: [CompanyService],
})
export class CompanyModule {}
