import {
  BadRequestException, Body, Controller, ForbiddenException, Param, Post, UseGuards
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CurrentUser } from './auth/current-user.decorator';
import { LocationService } from './location/location.service';

@UseGuards(JwtAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
  ) {}

  /** POST /jobs/:id/location  (COMPANY only) */
  @Post(':id/location')
  async setJobLocation(
    @CurrentUser() user: { sub: number; role?: string },
    @Param('id') id: string,
    @Body() body: { placeId: string },
  ) {
    if (user.role !== 'COMPANY') {
      throw new ForbiddenException('Only companies can set job location');
    }
    const jobId = Number(id);
    if (!jobId || !body.placeId) {
      throw new BadRequestException('Missing jobId or placeId');
    }

    // έλεγξε ownership: η αγγελία πρέπει να ανήκει στην εταιρεία του χρήστη
    const company = await this.prisma.company.findUnique({
      where: { userId: user.sub },
      select: { id: true },
    });
    if (!company) throw new ForbiddenException('Company profile not found');

    const job = await this.prisma.job.findUnique({
      where: { id: jobId },
      select: { id: true, companyId: true },
    });
    if (!job || job.companyId !== company.id) {
      throw new ForbiddenException('You do not own this job');
    }

    const place = await this.locationService.resolvePlaceId(body.placeId);

    const updated = await this.prisma.job.update({
      where: { id: jobId },
      data: {
        locationPlaceId: place.placeId,
        locationLat: place.lat,
        locationLng: place.lng,
        locationCity: place.city,
        locationAdmin: place.adminArea,
        locationCountryCode: place.countryCode,
        locationCountryName: place.countryName,
        locationText: place.fullText,
      },
      select: {
        id: true,
        title: true,
        locationText: true,
        locationCity: true,
        locationCountryCode: true,
      },
    });

    return updated;
  }
}