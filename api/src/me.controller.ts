// src/me.controller.ts

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { CurrentUser } from './auth/current-user.decorator';
import {
  UpdateCandidateProfileDto,
  UpdateCompanyProfileDto,
  SelectUserPlanDto,
} from './me.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { join, extname } from 'path';
import { mkdirSync } from 'fs';
import * as fsp from 'fs/promises';
import sharp from 'sharp';
import { CompanyPlan } from '@prisma/client';
import { LocationService } from './location/location.service';
import { R2Service } from './r2/r2.service'; // προσαρμόζεις path αν χρειαστεί
import { randomUUID } from 'crypto';


/** Single source of truth for uploads root (must match main.ts static serving) */
const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

// ====== Plan canonical names (onboarding / subscriptions) ======
type PlanCanonical =
  | 'FREE_MEMBER'
  | 'VIP_MEMBER'
  | 'COMPANY_BASIC'
  | 'COMPANY_SILVER'
  | 'COMPANY_GOLDEN';

const legacyToCanonical: Record<string, PlanCanonical> = {
  FREE: 'FREE_MEMBER',
  'VIP MEMBER': 'VIP_MEMBER',
  ΑΠΛΗ: 'COMPANY_BASIC',
  SILVER: 'COMPANY_SILVER',
  GOLDEN: 'COMPANY_GOLDEN',
};

const CandidatePlans = new Set<PlanCanonical>(['FREE_MEMBER', 'VIP_MEMBER']);
const CompanyPlans = new Set<PlanCanonical>([
  'COMPANY_BASIC',
  'COMPANY_SILVER',
  'COMPANY_GOLDEN',
]);

// ✅ defaults για plan benefits (adsEnabled/priceCents) όταν γίνεται direct grant
const planDefaults = (
  name: PlanCanonical,
): { adsEnabled: boolean; priceCents: number } => {
  switch (name) {
    case 'VIP_MEMBER':
      return { adsEnabled: false, priceCents: 0 };
    case 'FREE_MEMBER':
      return { adsEnabled: true, priceCents: 0 };
    case 'COMPANY_BASIC':
      return { adsEnabled: true, priceCents: 0 };
    case 'COMPANY_SILVER':
      return { adsEnabled: true, priceCents: 0 };
    case 'COMPANY_GOLDEN':
      return { adsEnabled: false, priceCents: 0 };
    default:
      return { adsEnabled: true, priceCents: 0 };
  }
};

// map canonical company plan → Prisma enum
const toCompanyPlan = (p: PlanCanonical): CompanyPlan | null => {
  switch (p) {
    case 'COMPANY_BASIC':
      return CompanyPlan.SIMPLE;
    case 'COMPANY_SILVER':
      return CompanyPlan.SILVER;
    case 'COMPANY_GOLDEN':
      return CompanyPlan.GOLDEN;
    default:
      return null;
  }
};

const forcePdfInline = (res: any, _filePath: string) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
};

@UseGuards(JwtAuthGuard)
@Controller('me')
export class MeController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly locationService: LocationService,
     private readonly r2: R2Service,
  ) {}

  // ========= GET /me =========
  @Get()
  async me(@CurrentUser() u: { sub: number }) {
    const user = await this.prisma.user.findUnique({
      where: { id: u.sub },
      include: {
        candidate: { include: { languages: true, locationPrefs: true } },
        company: true,
        subscriptions: {
          where: { NOT: { status: 'canceled' } },
          orderBy: { id: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });

    if (!user) return null;

    const skillsText = user.candidate?.skillsText ?? '';
    const skillsList = skillsText
      ? skillsText
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    const c: any = user.candidate as any;

    const candidateLocationDisplay =
      c?.locationText ||
      (c?.locationCity && c?.locationCountryCode
        ? `${c.locationCity}, ${c.locationCountryCode}`
        : c?.location || null);

    const candidateWithExtras = user.candidate
      ? {
          ...user.candidate,
          location: candidateLocationDisplay,
          // συμβατότητα με UI που περιμένει { skills: [{skill:{name}}] }
          skills: skillsList.map((name) => ({ skill: { name } })),
        }
      : undefined;

    const rawPlan = user.subscriptions?.[0]?.plan?.name ?? null;
    const planCanonical = rawPlan
      ? ((legacyToCanonical[rawPlan] ?? rawPlan) as PlanCanonical)
      : null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      candidate: candidateWithExtras,
      company: user.company,
      subscriptions: user.subscriptions,
      plan: planCanonical,
      onboardingCompleted: !!planCanonical,
      uiLanguage: user.candidate?.preferredLanguage ?? null,
      preferredLanguage: user.candidate?.preferredLanguage ?? null,
    };
  }

// ========= PUT /me/candidate/preferred-language =========
  @Put('candidate/preferred-language')
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async setCandidatePreferredLanguage(
    @CurrentUser() user: { sub: number; role?: string },
    @Body() body: { preferredLanguage: string },
  ) {
    if (user.role !== 'CANDIDATE') {
      throw new ForbiddenException('Only candidates can set preferredLanguage');
    }

    const lang = (body?.preferredLanguage || '').trim().toLowerCase();
    if (!lang) throw new BadRequestException('Missing preferredLanguage');

    // update candidate row
    await this.prisma.candidate.update({
      where: { userId: user.sub },
      data: { preferredLanguage: lang },
      select: { id: true },
    });

    return { ok: true, preferredLanguage: lang };
  }









  // ========= Shared storage (avatars / cv / reference-letters) =========
  private static storage = diskStorage({
    destination: (req, file, cb) => {
      let folder = 'avatars';
      if (file.fieldname === 'cv') folder = 'cv';
      if (file.fieldname === 'referenceLetter') folder = 'reference-letters';
      const dest = join(uploadsDir, folder);
      try {
        mkdirSync(dest, { recursive: true });
      } catch {}
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase();
      const safeExt =
        file.fieldname === 'referenceLetter' || file.fieldname === 'cv'
          ? '.pdf'
          : ext || '.jpg';
      const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${safeExt}`;
      cb(null, name);
    },
  });

  private async getCandidateIdOrThrow(userId: number) {
    const c = await this.prisma.candidate.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!c) throw new BadRequestException('Candidate not found');
    return c.id;
  }

  // ======== VIP helper (avatar allowed only for VIP members) ========
  private async isVipCandidate(userId: number): Promise<boolean> {
    const sub = await this.prisma.subscription.findFirst({
      where: { userId, status: 'active' },
      orderBy: { id: 'desc' },
      include: { plan: true },
    });
    const rawName = sub?.plan?.name ?? '';
    return typeof rawName === 'string' && rawName.toUpperCase().includes('VIP');
  }

  // ========= PUT /me/candidate =========
  @Put('candidate')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'avatar', maxCount: 1 },
        { name: 'cv', maxCount: 1 },
        { name: 'referenceLetter', maxCount: 1 },
      ],
      {
        storage: MeController.storage,
        limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      },
    ),
  )
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  async updateCandidate(
    @CurrentUser() user: { sub: number; role?: string },
    @Body() body: UpdateCandidateProfileDto,
    @UploadedFiles()
    files: {
      avatar?: Express.Multer.File[];
      cv?: Express.Multer.File[];
      referenceLetter?: Express.Multer.File[];
    },
  ) {
    if (user.role !== 'CANDIDATE') {
      throw new ForbiddenException('Only candidates can update candidate profile');
    }

    const avatarFile = files?.avatar?.[0] ?? null;
    const cvFile = files?.cv?.[0] ?? null;
    const refFile = files?.referenceLetter?.[0] ?? null;

    // ---- VIP gate for avatar ----
    if (avatarFile) {
      const isVip = await this.isVipCandidate(user.sub);
      if (!isVip) {
        try {
          await fsp.unlink(avatarFile.path);
        } catch {}
        throw new ForbiddenException('Avatar upload is available for VIP members only');
      }
    }
    // -----------------------------

    const current = await this.prisma.candidate.findUnique({
      where: { userId: user.sub },
      select: {
        id: true,
        name: true,
        location: true,
        headline: true,
        phone: true,
        about: true,
        education: true,
        experience: true,
        volunteering: true,
        skillsText: true,
        avatarUrl: true,
        cvUrl: true,
        profileCompleted: true,
        gender: true,
        birthDate: true,
        countryOfOrigin: true,
        driverLicenseA: true,
        driverLicenseM: true,
        preferredLanguage: true,
        referenceLetterUrl: true,
      },
    });

    // ✅ ALWAYS store as absolute path (starts with /)
    const newAvatarUrl = avatarFile ? `/media/avatars/${avatarFile.filename}` : undefined;
    const newCvUrl = cvFile ? `/media/cv/${cvFile.filename}` : undefined;
    const newRefUrl = refFile ? `/media/reference/${refFile.filename}` : undefined;

    const nextSkillsText = body.skillsCsv
      ? body.skillsCsv
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .join(',')
      : (body as any).skillsText ?? current?.skillsText ?? null;

    const merged = {
      name: body.name ?? current?.name ?? null,
      location: body.location ?? current?.location ?? null,
      headline: body.headline ?? current?.headline ?? null,
      phone: body.phone ?? current?.phone ?? null,
      about: body.about ?? current?.about ?? null,
      education: body.education ?? current?.education ?? null,
      experience: body.experience ?? current?.experience ?? null,
      volunteering: body.volunteering ?? current?.volunteering ?? null,
      skillsText: nextSkillsText,
      avatarUrl: newAvatarUrl ?? current?.avatarUrl ?? null,
      cvUrl: newCvUrl ?? current?.cvUrl ?? null,
      gender: body.gender ?? current?.gender ?? null,
      birthDate: body.birthDate
        ? new Date(body.birthDate)
        : current?.birthDate ?? null,
      countryOfOrigin: body.countryOfOrigin ?? current?.countryOfOrigin ?? null,
      driverLicenseA:
        body.driverLicenseA ?? current?.driverLicenseA ?? false,
      driverLicenseM:
        body.driverLicenseM ?? current?.driverLicenseM ?? false,
      preferredLanguage:
        body.preferredLanguage ?? current?.preferredLanguage ?? null,
      referenceLetterUrl:
        newRefUrl ?? (body as any).referenceLetterUrl ?? current?.referenceLetterUrl ?? null,
    };

    const completedNow =
      !!merged.name && !!(merged.experience || merged.skillsText || merged.about);
    const finalProfileCompleted = (current?.profileCompleted ?? false) || completedNow;

    const updated = await this.prisma.candidate.update({
      where: { userId: user.sub },
      data: { ...merged, profileCompleted: finalProfileCompleted },
      select: {
        id: true,
        name: true,
        location: true,
        headline: true,
        phone: true,
        about: true,
        education: true,
        experience: true,
        volunteering: true,
        skillsText: true,
        avatarUrl: true,
        cvUrl: true,
        profileCompleted: true,
        gender: true,
        birthDate: true,
        countryOfOrigin: true,
        driverLicenseA: true,
        driverLicenseM: true,
        preferredLanguage: true,
        referenceLetterUrl: true,
      },
    });

    // languages can come as JSON string or array
    let parsedLanguages: Array<{ name: string; level?: string }> | null = null;

    if (typeof (body as any).languages === 'string') {
      try {
        parsedLanguages = JSON.parse((body as any).languages);
      } catch {
        throw new BadRequestException('Invalid languages JSON.');
      }
    } else if (Array.isArray((body as any).languages)) {
      parsedLanguages = (body as any).languages;
    }

    if (Array.isArray(parsedLanguages)) {
      await this.prisma.candidateLanguage.deleteMany({
        where: { candidateId: updated.id },
      });
      if (parsedLanguages.length) {
        await this.prisma.candidateLanguage.createMany({
          data: parsedLanguages
            .filter((l) => l && l.name)
            .map((l) => ({
              candidateId: updated.id,
              name: l.name.trim(),
              level: (l.level ?? '').trim(),
            })),
        });
      }
    }

    const final = await this.prisma.candidate.findUnique({
      where: { id: updated.id },
      include: { languages: true },
    });

    return final;
  }

  // ========= POST /me/candidate/location (normalized save) =========
  @Post('candidate/location')
  async setCandidateLocation(
    @CurrentUser() user: { sub: number; role?: string },
    @Body() body: { placeId: string },
  ) {
    if (user.role !== 'CANDIDATE') {
      throw new ForbiddenException('Only candidates can set candidate location');
    }
    if (!body?.placeId) {
      throw new BadRequestException('Missing placeId');
    }

    const place = await this.locationService.resolvePlaceId(body.placeId);

    return this.prisma.candidate.update({
      where: { userId: user.sub },
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
        locationCity: true,
        locationCountryName: true,
        locationLat: true,
        locationLng: true,
        locationText: true,
      },
    });
  }

  // ========= GET /me/candidate/locations =========
  @Get('candidate/locations')
  async listMyLocationPrefs(
    @CurrentUser() user: { sub: number; role?: string },
  ) {
    if (user.role !== 'CANDIDATE') {
      throw new ForbiddenException('Only candidates can list location preferences');
    }
    const candidateId = await this.getCandidateIdOrThrow(user.sub);

    return this.prisma.candidateLocationPreference.findMany({
      where: { candidateId },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  // ========= POST /me/candidate/locations =========
  @Post('candidate/locations')
  async addMyLocationPref(
    @CurrentUser() user: { sub: number; role?: string },
    @Body()
    body: {
      placeId?: string;
      text?: string;
      city?: string;
      admin?: string;
      countryCode?: string;
      countryName?: string;
      lat?: number;
      lng?: number;
    },
  ) {
    if (user.role !== 'CANDIDATE') {
      throw new ForbiddenException('Only candidates can add location preferences');
    }
    const candidateId = await this.getCandidateIdOrThrow(user.sub);

    let payload:
      | {
          placeId: string;
          text: string;
          city?: string | null;
          admin?: string | null;
          countryCode?: string | null;
          countryName?: string | null;
          lat: number;
          lng: number;
        }
      | null = null;

    if (body.placeId && typeof body.lat !== 'number' && typeof body.lng !== 'number') {
      const place = await this.locationService.resolvePlaceId(body.placeId);
      payload = {
        placeId: place.placeId,
        text: place.fullText,
        city: place.city ?? null,
        admin: place.adminArea ?? null,
        countryCode: place.countryCode ?? null,
        countryName: place.countryName ?? null,
        lat: place.lat,
        lng: place.lng,
      };
    } else if (
      body.placeId &&
      typeof body.lat === 'number' &&
      typeof body.lng === 'number' &&
      (body.text || body.city || body.countryName)
    ) {
      payload = {
        placeId: body.placeId,
        text:
          body.text ?? [body.city, body.countryName].filter(Boolean).join(', '),
        city: body.city ?? null,
        admin: body.admin ?? null,
        countryCode: body.countryCode ?? null,
        countryName: body.countryName ?? null,
        lat: body.lat,
        lng: body.lng,
      };
    }

    if (!payload) {
      throw new BadRequestException('Provide either placeId or full location payload');
    }

    const created = await this.prisma.candidateLocationPreference.upsert({
      where: {
        candidateId_placeId: {
          candidateId,
          placeId: payload.placeId,
        },
      },
      update: {
        text: payload.text,
        city: payload.city,
        admin: payload.admin,
        countryCode: payload.countryCode,
        countryName: payload.countryName,
        lat: payload.lat,
        lng: payload.lng,
      },
      create: {
        candidateId,
        placeId: payload.placeId,
        text: payload.text,
        city: payload.city,
        admin: payload.admin,
        countryCode: payload.countryCode,
        countryName: payload.countryName,
        lat: payload.lat,
        lng: payload.lng,
      },
    });

    return created;
  }

  // ========= DELETE /me/candidate/locations/:id =========
  @Delete('candidate/locations/:id')
  async deleteMyLocationPref(
    @CurrentUser() user: { sub: number; role?: string },
    @Param('id') id: string,
  ) {
    if (user.role !== 'CANDIDATE') {
      throw new ForbiddenException('Only candidates can delete location preferences');
    }
    const candidateId = await this.getCandidateIdOrThrow(user.sub);
    const prefId = Number(id) || 0;

    const { count } = await this.prisma.candidateLocationPreference.deleteMany({
      where: { id: prefId, candidateId },
    });

    return { ok: count > 0 };
  }

  // ========= PUT /me/company =========
  @Put('company')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateCompany(
    @CurrentUser() user: { sub: number; role?: string },
    @Body() body: UpdateCompanyProfileDto,
  ) {
    if (user?.role !== 'COMPANY') {
      throw new ForbiddenException('Only company users can update company profile');
    }

    const existing = await this.prisma.company.findUnique({
      where: { userId: user.sub },
      select: {
        id: true,
        userId: true,
        name: true,
        country: true,
        website: true,
        about: true,
        phone: true,
        heading: true,
        address: true,
        logoUrl: true,
        profileCompleted: true,
      },
    });

    if (!existing && !body.name) {
      throw new BadRequestException('Field "name" is required for company creation.');
    }

    const computeCompleted = (
      name: string | undefined,
      src: { website?: string | null; about?: string | null; phone?: string | null },
    ) => !!name && !!(src.website || src.about || src.phone);

    if (!existing) {
      const createData = {
        name: body.name as string,
        country: body.country ?? null,
        website: body.website ?? null,
        about: body.about ?? null,
        phone: body.phone ?? null,
        heading: body.heading ?? null,
        address: body.address ?? null,
        logoUrl: body.logoUrl ?? null,
      };

      const finalCompleted = computeCompleted(createData.name, createData);

      const created = await this.prisma.company.upsert({
        where: { userId: user.sub },
        create: {
          ...createData,
          profileCompleted: finalCompleted,
          user: { connect: { id: user.sub } },
        },
        update: {},
        select: {
          id: true,
          userId: true,
          name: true,
          country: true,
          website: true,
          about: true,
          phone: true,
          heading: true,
          address: true,
          logoUrl: true,
          profileCompleted: true,
        },
      });

      return created;
    }

    const updateData: any = {
      ...(body.name !== undefined ? { name: body.name } : {}),
      country: body.country ?? existing.country ?? null,
      website: body.website ?? existing.website ?? null,
      about: body.about ?? existing.about ?? null,
      phone: body.phone ?? existing.phone ?? null,
      heading: body.heading ?? existing.heading ?? null,
      address: body.address ?? existing.address ?? null,
      logoUrl: body.logoUrl ?? existing.logoUrl ?? null,
    };

    const completedNow = computeCompleted(updateData.name ?? existing.name, {
      website: updateData.website,
      about: updateData.about,
      phone: updateData.phone,
    });

    updateData.profileCompleted = existing.profileCompleted || completedNow;

    const updated = await this.prisma.company.update({
      where: { userId: user.sub },
      data: updateData,
      select: {
        id: true,
        userId: true,
        name: true,
        country: true,
        website: true,
        about: true,
        phone: true,
        heading: true,
        address: true,
        logoUrl: true,
        profileCompleted: true,
      },
    });

    return updated;
  }

  @Post('candidate/video/presign')
async presignCandidateVideo(
  @CurrentUser() user: { sub: number; role?: string },
  @Body() body: { contentType?: string },
) {
  if (user.role !== 'CANDIDATE') {
    throw new ForbiddenException('Only candidates can upload video');
  }

  const contentType = (body?.contentType || '').toLowerCase().trim();
  const allowed = ['video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowed.includes(contentType)) {
    throw new BadRequestException('Invalid contentType. Allowed: video/mp4, video/webm, video/quicktime');
  }

  const candidateId = await this.getCandidateIdOrThrow(user.sub);

  const ext =
    contentType === 'video/webm' ? 'webm' :
    contentType === 'video/quicktime' ? 'mov' :
    'mp4';

  const key = `candidate-videos/${candidateId}/${Date.now()}-${randomUUID()}.${ext}`;

  const uploadUrl = await this.r2.presignPut({
    key,
    contentType,
    expiresInSec: 60 * 5,
  });

  // optional: mark UPLOADING
  await this.prisma.candidate.update({
    where: { id: candidateId },
    data: { videoStatus: 'UPLOADING' },
  });

  return { uploadUrl, objectKey: key };
}

@Post('candidate/video/confirm')
async confirmCandidateVideo(
  @CurrentUser() user: { sub: number; role?: string },
  @Body() body: { objectKey?: string },
) {
  if (user.role !== 'CANDIDATE') {
    throw new ForbiddenException('Only candidates can confirm video');
  }
  const candidateId = await this.getCandidateIdOrThrow(user.sub);

  const key = String(body?.objectKey || '').trim();
  if (!key || !key.startsWith(`candidate-videos/${candidateId}/`)) {
    throw new BadRequestException('Invalid objectKey');
  }

  // check exists + size
  const head = await this.r2.headObject(key);
  const size = Number(head?.ContentLength ?? 0);

  // π.χ. 25MB hard limit (για 15 sec είναι αρκετό)
  const MAX = 25 * 1024 * 1024;
  if (!size || size > MAX) {
    // delete and reject
    try { await this.r2.deleteObject(key); } catch {}
    await this.prisma.candidate.update({
      where: { id: candidateId },
      data: {
        videoStatus: 'REJECTED',
        videoKey: null,
        videoDurationSec: null,
        videoUpdatedAt: new Date(),
      },
    });
    throw new BadRequestException('Video too large (max 25MB).');
  }

  // delete previous video if exists (replace behavior)
  const prev = await this.prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { videoKey: true },
  });
  if (prev?.videoKey && prev.videoKey !== key) {
    try { await this.r2.deleteObject(prev.videoKey); } catch {}
  }

  await this.prisma.candidate.update({
    where: { id: candidateId },
    data: {
      videoKey: key,
      videoStatus: 'READY',
      videoUpdatedAt: new Date(),
    },
  });

  return { ok: true };
}

@Delete('candidate/video')
async deleteCandidateVideo(@CurrentUser() user: { sub: number; role?: string }) {
  if (user.role !== 'CANDIDATE') {
    throw new ForbiddenException('Only candidates can delete video');
  }
  const candidateId = await this.getCandidateIdOrThrow(user.sub);

  const c = await this.prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { videoKey: true },
  });

  if (c?.videoKey) {
    try { await this.r2.deleteObject(c.videoKey); } catch {}
  }

  await this.prisma.candidate.update({
    where: { id: candidateId },
    data: {
      videoKey: null,
      videoStatus: null,
      videoDurationSec: null,
      videoUpdatedAt: new Date(),
    },
  });

  return { ok: true };
}


@Get('candidate/video/play')
async playCandidateVideo(@CurrentUser() user: { sub: number; role?: string }) {
  if (user.role !== 'CANDIDATE') {
    throw new ForbiddenException('Only candidates can access video');
  }

  const candidateId = await this.getCandidateIdOrThrow(user.sub);

  const cand = await this.prisma.candidate.findUnique({
    where: { id: candidateId },
    select: { videoKey: true, videoStatus: true },
  });

  if (!cand?.videoKey) {
    return { playUrl: null };
  }

  // προαιρετικά: αν θες να επιτρέπεις μόνο όταν είναι READY
  if (cand.videoStatus && cand.videoStatus !== 'READY') {
    return { playUrl: null };
  }

  const playUrl = await this.r2.presignGet({
    key: cand.videoKey,
    expiresInSec: 60 * 10, // 10 λεπτά
  });

  return { playUrl };
}

  // ========= Helpers για αρχεία (company media) =========
  private ensureDir(p: string) {
    try {
      mkdirSync(p, { recursive: true });
    } catch {}
  }

  private randomName(ext = '.jpg') {
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  }

  /** ========= PUT /me/company/media (multipart) ========= */
  @Put('company/media')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'logo', maxCount: 1 },
        { name: 'cover', maxCount: 1 },
      ],
      {
        storage: memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 },
      },
    ),
  )
  async uploadCompanyMedia(
    @CurrentUser() user: { sub: number; role?: string },
    @UploadedFiles()
    files: { logo?: Express.Multer.File[]; cover?: Express.Multer.File[] },
  ) {
    if (user?.role !== 'COMPANY') {
      throw new ForbiddenException('Only company users can upload company media');
    }

    const existing = await this.prisma.company.findUnique({
      where: { userId: user.sub },
      select: { id: true, logoUrl: true, coverUrl: true, name: true },
    });

    if (!existing) {
      throw new BadRequestException(
        'Please create the company record first (name) before uploading media.',
      );
    }

    const uploadsRoot = uploadsDir;
    const logoOutDir = join(uploadsRoot, 'company-logos', 'medium');
    const coverOutDir = join(uploadsRoot, 'company-covers', 'medium');

    this.ensureDir(logoOutDir);
    this.ensureDir(coverOutDir);

    let newLogoUrl: string | undefined;
    const logoFile = files?.logo?.[0];
    if (logoFile?.buffer) {
      const outName = this.randomName('.jpg');
      const outPath = join(logoOutDir, outName);
      await sharp(logoFile.buffer)
        .resize(192, 192, { fit: 'cover' })
        .jpeg({ quality: 82 })
        .toFile(outPath);
      newLogoUrl = `/media/company-logos/medium/${outName}`;
    }

    let newCoverUrl: string | undefined;
    const coverFile = files?.cover?.[0];
    if (coverFile?.buffer) {
      const outName = this.randomName('.jpg');
      const outPath = join(coverOutDir, outName);
      await sharp(coverFile.buffer)
        .resize(1600, 420, { fit: 'cover' })
        .jpeg({ quality: 85 })
        .toFile(outPath);
      newCoverUrl = `/media/company-covers/medium/${outName}`;
    }

    if (!newLogoUrl && !newCoverUrl) {
      throw new BadRequestException('No files provided. Use fields: logo, cover');
    }

    const updated = await this.prisma.company.update({
      where: { userId: user.sub },
      data: {
        ...(newLogoUrl ? { logoUrl: newLogoUrl } : {}),
        ...(newCoverUrl ? { coverUrl: newCoverUrl } : {}),
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        coverUrl: true,
        heading: true,
        phone: true,
        address: true,
      },
    });

    return {
      logoUrl: updated.logoUrl,
      coverUrl: updated.coverUrl,
      company: updated,
    };
  }

  // ========= PUT /me/plan =========
  @Put('plan')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async selectPlan(
    @CurrentUser() user: { sub: number; role?: 'CANDIDATE' | 'COMPANY' | 'ADMIN' },
    @Body() body: SelectUserPlanDto,
  ) {
    const raw = (body.plan || '').trim();
    if (!raw) throw new BadRequestException('Missing plan');

    const db = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { role: true },
    });

    const role = db?.role ?? (user.role as any);
    if (!role || role === 'ADMIN') throw new ForbiddenException('Not allowed');

    const planName = (legacyToCanonical[raw] ?? raw) as PlanCanonical;

    if (role === 'CANDIDATE' && !CandidatePlans.has(planName)) {
      throw new BadRequestException(
        `Plan "${planName}" not allowed for role "CANDIDATE".`,
      );
    }
    if (role === 'COMPANY' && !CompanyPlans.has(planName)) {
      throw new BadRequestException(
        `Plan "${planName}" not allowed for role "COMPANY".`,
      );
    }

    const defaults = planDefaults(planName);

    const plan = await this.prisma.plan.upsert({
      where: { name: planName },
      update: defaults,
      create: { name: planName, ...defaults },
    });

    await this.prisma.subscription.updateMany({
      where: { userId: user.sub, NOT: { status: 'canceled' } },
      data: { status: 'canceled' },
    });

    await this.prisma.subscription.create({
      data: { userId: user.sub, planId: plan.id, status: 'active' },
    });

    if (role === 'COMPANY') {
      const cp = toCompanyPlan(planName);
      if (cp) {
        const company = await this.prisma.company.findUnique({
          where: { userId: user.sub },
          select: { id: true },
        });
        if (company) {
          await this.prisma.company.update({
            where: { userId: user.sub },
            data: { plan: cp },
          });
        }
      }
    }

    return { ok: true, selected: planName };
  }

  // ========= GET /me/ratings (stub) =========
  @Get('ratings')
  async getMyRatings(@CurrentUser() user: { sub: number }) {
    return [];
  }
}

