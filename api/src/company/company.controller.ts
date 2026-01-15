import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
  UsePipes,
  ParseIntPipe,
  ForbiddenException,
  ValidationPipe,
} from '@nestjs/common';
import { CompanyService } from './company.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsInt,
  Length,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { JobStatus, JobWorkMode, SwipeDecision, JobSector } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { LocationService } from '../location/location.service';

const toBool = (v: any) =>
  v === true || v === 'true' || v === '1' || v === 1 || v === 'on' || v === 'ON';

const normWorkMode = (v: any) => {
  const s = (v ?? '').toString().trim().toUpperCase().replace(/[-\s]/g, '');
  if (s === 'ONSITE' || s === 'ON_SITE') return 'ONSITE';
  if (s === 'REMOTE') return 'REMOTE';
  if (s === 'HYBRID') return 'HYBRID';
  return undefined;
};

class CreateJobDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @Length(2, 160)
  title!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : ''))
  @IsString()
  @Length(10, 10000)
  description!: string;

  @Transform(({ value, obj }) => {
    const fromObj = value ?? obj.workmode ?? obj.mode ?? obj.work ?? obj['work_mode'];
    const s = (fromObj ?? '').toString().trim().toUpperCase().replace(/[-\s]/g, '');
    if (s === 'ONSITE') return 'ONSITE';
    if (s === 'REMOTE') return 'REMOTE';
    if (s === 'HYBRID') return 'HYBRID';
    return fromObj;
  })
  @IsEnum(JobWorkMode, { message: 'workMode must be one of: ONSITE, REMOTE, HYBRID' })
  workMode!: JobWorkMode;

  @Transform(({ value, obj }) => value ?? obj.driverA ?? obj['driverA'])
  @Type(() => Boolean)
  @IsBoolean()
  driverLicenseARequired!: boolean;

  @Transform(({ value, obj }) => value ?? obj.driverM ?? obj['driverM'])
  @Type(() => Boolean)
  @IsBoolean()
  driverLicenseMRequired!: boolean;

  @Transform(({ value, obj }) => {
    const raw = value ?? obj.skillsCsv ?? obj['skills[]'] ?? obj['skills'];
    if (Array.isArray(raw)) return raw.join(',');
    return typeof raw === 'string' ? raw : '';
  })
  @IsString()
  @Length(1, 2000)
  skills!: string;

  @IsOptional()
  @IsEnum(JobSector)
  sector?: JobSector;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : undefined))
  @IsString()
  @Length(1, 160)
  sectorOtherText?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : undefined))
  @IsString()
  @Length(2, 10)
  preferredLanguage?: string;

  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : undefined))
  @IsIn(['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'NATIVE'])
  preferredLangLevel?: string;
}

class SwipeDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  jobId!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  candidateId!: number;

  @IsEnum(SwipeDecision)
  decision!: SwipeDecision;
}

class MatchRatingDto {
  @Transform(({ value }) => Number(value))
  @IsInt()
  jobId!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  candidateId!: number;

  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;
}

@UseGuards(JwtAuthGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
@Controller('company')
export class CompanyController {
  constructor(
    private readonly service: CompanyService,
    private readonly locationService: LocationService,
  ) {}

  @Get('jobs/limits')
  myJobLimits(@CurrentUser() user: { sub: number }) {
    return this.service.getJobCountersByUserId(user.sub);
  }

  @Get('jobs')
  listJobs(@CurrentUser() user: { sub: number }, @Query('status') status?: JobStatus) {
    return this.service.listJobsByUserId(user.sub, status);
  }

  @Get('jobs/minimal')
  myJobsLite(@CurrentUser() user: { sub: number }) {
    return this.service.getMyJobsLite(user.sub);
  }

  @Post('jobs')
  createJob(@CurrentUser() user: { sub: number }, @Body() dto: CreateJobDto) {
    const skills = dto.skills
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!skills.length) {
      throw new BadRequestException('Skills is required (comma-separated).');
    }

    return this.service.createJobByUserId(user.sub, {
      title: dto.title,
      description: dto.description,
      workMode: dto.workMode,
      requireLicenseA: dto.driverLicenseARequired,
      requireLicenseM: dto.driverLicenseMRequired,
      skills,
      sector: dto.sector,
      sectorOtherText: dto.sector === 'OTHER' ? dto.sectorOtherText || undefined : undefined,
      preferredLanguage: dto.preferredLanguage || undefined,
      preferredLangLevel: dto.preferredLangLevel || undefined,
    });
  }

  @Post('jobs/:id/location')
  async setJobLocation(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { placeId: string },
  ) {
    if (!body?.placeId?.trim()) {
      throw new BadRequestException('Missing placeId');
    }
    const place = await this.locationService.resolvePlaceId(body.placeId);
    return this.service.setJobLocationByUserId(user.sub, id, {
      placeId: place.placeId,
      lat: place.lat,
      lng: place.lng,
      city: place.city,
      adminArea: place.adminArea,
      countryCode: place.countryCode,
      countryName: place.countryName,
      fullText: place.fullText,
    });
  }

  @Put('jobs/:id/archive')
  archive(@CurrentUser() user: { sub: number }, @Param('id') id: string) {
    return this.service.archiveJobByUserId(user.sub, Number(id));
  }

  /** Υποψήφιοι που έκαναν LIKE στη συγκεκριμένη αγγελία */
  @Get('matchups')
  likesForJob(
    @CurrentUser() user: { sub: number },
    @Query('jobId', ParseIntPipe) jobId: number,
  ) {
    return this.service.getLikesForJob(user.sub, jobId);
  }

  /** Καταγραφή swipe της εταιρείας (LIKE/PASS) */
  @Post('matchups/swipe')
  swipe(@CurrentUser() user: { sub: number }, @Body() body: SwipeDto) {
    return this.service.swipeCandidate(user.sub, body.jobId, body.candidateId, body.decision);
  }

  /** Αποθήκευση βαθμολογίας 1–5 για συγκεκριμένο job+candidate */
  @Post('matchups/rate')
  rate(
    @CurrentUser() user: { sub: number },
    @Body() body: MatchRatingDto,
  ) {
    return this.service.rateCandidate(user.sub, body.jobId, body.candidateId, body.rating);
  }

  /** Λίστα θετικών swipes (όλων των αγγελιών) */
  @Get('matchups/liked')
  liked(@CurrentUser() user: { sub: number }) {
    return this.service.listLikedByUserId(user.sub);
  }

  @Get('matchups/video')
async getCandidateVideoForMatchup(
  @CurrentUser() user: { sub: number },
  @Query('jobId', ParseIntPipe) jobId: number,
  @Query('candidateId', ParseIntPipe) candidateId: number,
) {
  return this.service.getCandidateVideoForLikedMatchup(user.sub, jobId, candidateId);
}

  /** Δημόσιο προφίλ υποψηφίου για popup */
  @Get('candidates/:id')
  async getCandidatePublic(
    @CurrentUser() user: { sub: number },
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.service.ensureCompany(user.sub);
    return this.service.getCandidatePublic(id);
  }
}
