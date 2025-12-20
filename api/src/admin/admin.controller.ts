import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Prisma, Role } from '@prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private prisma: PrismaService) {}

  // GET /admin/users?q=&page=&size=
  @Get('users')
  async listUsers(
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('size') size = '20',
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const s = Math.min(100, Math.max(1, parseInt(size, 10) || 20));

    const where: Prisma.UserWhereInput = {};

    if (q && q.trim()) {
      const qTrim = q.trim();
      const qUpper = qTrim.toUpperCase();

      const orClauses: Prisma.UserWhereInput[] = [
        {
          email: { contains: qTrim, mode: Prisma.QueryMode.insensitive },
        },
        { company: { name: { contains: qTrim, mode: Prisma.QueryMode.insensitive } } },
        { candidate: { name: { contains: qTrim, mode: Prisma.QueryMode.insensitive } } },
      ];

      if (['ADMIN', 'COMPANY', 'CANDIDATE'].includes(qUpper)) {
        orClauses.push({ role: { equals: qUpper as Role } });
      }

      where.OR = orClauses;
    }

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        orderBy: { id: 'desc' },
        skip: (p - 1) * s,
        take: s,
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          company: { select: { id: true, name: true, profileCompleted: true } },
          candidate: { select: { id: true, name: true, profileCompleted: true } },
          subscriptions: {
            where: { status: 'active' },
            orderBy: { id: 'desc' },
            take: 1,
            select: {
              id: true,
              status: true,
              expiresAt: true,
              plan: { select: { name: true, priceCents: true } },
            },
          },
        },
      }),
    ]);

    return { total, page: p, size: s, items };
  }

  // PATCH /admin/users/:id/role  body: { role: 'ADMIN'|'COMPANY'|'CANDIDATE' }
  @Patch('users/:id/role')
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: Role },
  ) {
    const { role } = body;
    if (!role || !['ADMIN', 'COMPANY', 'CANDIDATE'].includes(role)) {
      throw new BadRequestException('Invalid role');
    }
    await this.prisma.user.update({ where: { id }, data: { role } });
    return { ok: true };
  }

  // PATCH /admin/users/:id/plan  body: { planName: string, expiresAt?: string }
  @Patch('users/:id/plan')
  async setPlan(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { planName: string; expiresAt?: string },
  ) {
    const { planName, expiresAt } = body;
    if (!planName) throw new BadRequestException('Missing planName');

    const plan = await this.prisma.plan.findUnique({ where: { name: planName } });
    if (!plan) throw new BadRequestException('Plan not found');

    const active = await this.prisma.subscription.findFirst({
      where: { userId: id, status: 'active' },
      orderBy: { id: 'desc' },
    });

    if (active) {
      await this.prisma.subscription.update({
        where: { id: active.id },
        data: { planId: plan.id, expiresAt: expiresAt ? new Date(expiresAt) : null },
      });
    } else {
      await this.prisma.subscription.create({
        data: { userId: id, planId: plan.id, status: 'active', expiresAt: expiresAt ? new Date(expiresAt) : null },
      });
    }
    return { ok: true };
  }

  // GET /admin/users/:id
  @Get('users/:id')
  async userDetail(@Param('id', ParseIntPipe) id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        candidate: true,
        company: true,
        subscriptions: {
          where: { status: 'active' },
          orderBy: { id: 'desc' },
          take: 1,
          include: { plan: true },
        },
      },
    });
  }
}