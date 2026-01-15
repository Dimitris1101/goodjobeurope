import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ForbiddenException,
  Param,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CandidateService } from './candidate.service';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsIn } from 'class-validator';
import { PrismaService } from '../prisma.service';
import { R2Service } from '../r2/r2.service';

class MatchupsQueryDto {
  @Transform(({ value }) => Number(value))
  @IsOptional()
  @IsInt()
  limit?: number;

  @IsOptional()
  placeIds?: string; // CSV of placeId
  @IsOptional()
  locations?: string; // CSV of free-text descriptions
  @IsOptional()
  sectors?: string; // CSV of enum values: IT,SALES,...

  @IsOptional()
  sectorOtherText?: string; // free text only if sectors includes OTHER
}

class SwipeDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  jobId!: number;

  @IsIn(['LIKE', 'PASS'])
  decision!: 'LIKE' | 'PASS';
}

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }))
@Controller('candidate')
export class CandidateController {
  constructor(
  private readonly service: CandidateService,
  private readonly prisma: PrismaService,
  private readonly r2: R2Service,
) {}


  @Get('matchups')
  async matchups(@CurrentUser() user: { sub: number }, @Query() q: MatchupsQueryDto) {
    const limit = q.limit && q.limit > 0 ? q.limit : 30;

    const hasSectors = !!(
      q.sectors &&
      q.sectors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean).length
    );
    const hasLocations =
      !!(
        q.placeIds &&
        q.placeIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean).length
      ) ||
      !!(
        q.locations &&
        q.locations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean).length
      );

    // Απαιτείται ΚΑΙ τοποθεσία ΚΑΙ τομέας, αλλιώς δεν επιστρέφουμε αγγελίες
    if (!hasSectors || !hasLocations) {
      return []; // (μπορείς και BadRequestException αν προτιμάς)
    }

    return this.service.getMatchupsByUserId(user.sub, limit, {
      placeIdsCsv: q.placeIds,
      locationsCsv: q.locations,
      sectorsCsv: q.sectors,
      sectorOtherText: q.sectorOtherText,
    });
  }

  @Get(':candidateId/video/play')
async playCandidateVideoForCompany(
  @CurrentUser() user: { sub: number; role?: string },
  @Param('candidateId') candidateIdRaw: string,
) {
  if (user.role !== 'COMPANY') {
    throw new ForbiddenException('Only companies can access candidate videos');
  }

  const candidateId = Number(candidateIdRaw) || 0;
  if (!candidateId) return { playUrl: null };

  const cand = await this.prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { videoKey: true, videoStatus: true },
  });

  if (!cand?.videoKey) return { playUrl: null };
  if (cand.videoStatus && cand.videoStatus !== 'READY') return { playUrl: null };

  const playUrl = await this.r2.presignGet({
    key: cand.videoKey,
    expiresInSec: 60 * 10,
  });

  return { playUrl };
}

  @Post('swipe')
  async swipe(@CurrentUser() user: { sub: number }, @Body() body: SwipeDto) {
    return this.service.swipeJob(user.sub, {
      jobId: body.jobId,
      decision: body.decision,
    });
  }

  @Get('likes')
  async myLikes(@CurrentUser() user: { sub: number }) {
    return this.service.getMyLikesByUserId(user.sub);
  }

  /** τα ratings που έχουν δώσει οι εταιρείες στον υποψήφιο */
  @Get('ratings')
  async myRatings(@CurrentUser() user: { sub: number }) {
    return this.service.listCompanyRatingsByUserId(user.sub);
  }
}
