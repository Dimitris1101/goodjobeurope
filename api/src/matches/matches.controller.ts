import {
  BadRequestException, Body, Controller, Param, ParseIntPipe, Post,
  UseGuards, ValidationPipe, InternalServerErrorException
} from '@nestjs/common';
import { MatchesService } from './matches.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { getUserId } from '../auth/get-user-id.util';

class AcceptByDto {
  @Type(() => Number) @IsInt() jobId!: number;
  @Type(() => Number) @IsInt() candidateId!: number;
}

@UseGuards(JwtAuthGuard)
@Controller('matches')
export class MatchesController {
  constructor(private service: MatchesService) {}

  @Post(':id/accept')
  async accept(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: any) {
    const userId = getUserId(user);
    return this.service.acceptMatch(id, userId);
  }

  @Post('accept-by')
  async acceptBy(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: AcceptByDto,
    @CurrentUser() user: any,
  ) {
    try {
      if (!dto?.jobId || !dto?.candidateId) {
        throw new BadRequestException('jobId & candidateId are required');
      }
      const userId = getUserId(user);
      return await this.service.acceptByPair(dto.jobId, dto.candidateId, userId);
    } catch (err: any) {
      console.error('accept-by failed:', {
        name: err?.name,
        code: err?.code,
        message: err?.message,
        meta: err?.meta,
      });
      if (err?.code === 'P2003') throw new BadRequestException('Invalid jobId or candidateId (FK).');
      if (err?.code === 'P2025') throw new BadRequestException('Record not found.');
      if (err?.code === 'P2002') throw new BadRequestException('Unique constraint failed.');
      throw new InternalServerErrorException(err?.message || 'accept-by failed');
    }
  }
}