import {
  BadRequestException,
  Controller,
  Query,
  Post,
  Body,
  UnauthorizedException,
  Get,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { PrismaService } from '../prisma.service';
import { MailerService } from '../mailer.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { GoogleAuthGuard, FacebookAuthGuard } from './guards';

/** ---------- DTOs για να φύγουν τα any ---------- */
type UserRole = 'COMPANY' | 'CANDIDATE';

interface RegisterDto {
  email: string;
  password: string;
  role: UserRole;
  name: string;
  country?: string | null;
  location?: string | null;
  uiLanguage?: string;
}

interface LoginDto {
  email: string;
  password: string;
}

interface ForgotDto {
  email: string;
}

interface ResetDto {
  token: string;
  newPassword: string;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  /** -------------------- REGISTER -------------------- */
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const { email, password, role, name, country, location } = body;

    if (!email || !password || !role || !name) {
      throw new BadRequestException('Missing required fields');
    }

    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new UnauthorizedException('Email already in use');

    const hash = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hash,
        role,
        ...(role === 'COMPANY'
          ? { company: { create: { name, country: country ?? null } } }
          : { candidate: { create: { name, location: location ?? null } } }),
      },
      select: { id: true, email: true, role: true },
    });

    // --- Email verification token + mail ---
    const tokenStr = crypto.randomBytes(32).toString('hex');
    const ttlMinutes = Number(process.env.EMAIL_VERIFY_TTL_MINUTES ?? 60 * 24);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token: tokenStr, expiresAt },
    });

    const url = `${process.env.APP_BASE_URL}/auth/verify?token=${tokenStr}`;
    const html = `
      <p>GoodJobEurope e-mail verification</p>
      <p>The link is active for ${ttlMinutes} minutes.</p>
      <p><a href="${url}">${url}</a></p>
    `;
    await this.mailer.send(user.email, 'Verify your e-mail', html);

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    return { access_token: token, user };
  }

  /** -------------------- LOGIN -------------------- */
  @Post('login')
async login(@Body() body: any) {
  const { email, password } = body;
  if (!email || !password) {
    throw new BadRequestException('Email and password are required');
  }

  const user = await this.prisma.user.findUnique({ where: { email } });
  // Μην αποκαλύπτεις αν υπάρχει/δεν υπάρχει (κρατάμε το παλιό μήνυμα)
  if (!user) throw new UnauthorizedException('Invalid credentials');

  // αν ο λογαριασμός δεν έχει καθόλου password (π.χ. δημιουργήθηκε με Google/Facebook)
  if (!user.passwordHash) {
    // Μπορείς να επιλέξεις και πιο “ουδέτερο” μήνυμα για να μη δίνεις πληροφορία
    throw new UnauthorizedException('This account has no password set. Use social login or reset your password.');
  }

  const ok = await bcrypt.compare(password, user.passwordHash); // εδώ πλέον είναι string
  if (!ok) throw new UnauthorizedException('Invalid credentials');

  if (!user.emailVerified) {
    throw new UnauthorizedException('Please verify your email first');
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' },
  );

  return {
    access_token: token,
    user: { id: user.id, email: user.email, role: user.role },
  };
}

  /** -------------------- FORGOT PASSWORD -------------------- */
  @Post('forgot-password')
  async forgot(@Body() body: ForgotDto) {
    const { email } = body;
    if (!email) throw new BadRequestException('Email required');

    const user = await this.prisma.user.findUnique({ where: { email } });
    // για security, μην αποκαλύπτεις αν υπάρχει
    if (!user) return { ok: true };

    const token = crypto.randomBytes(32).toString('hex');
    const ttlMinutes = Number(process.env.RESET_TOKEN_TTL_MINUTES ?? 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const url = `${process.env.APP_BASE_URL}/auth/reset?token=${token}`;
    const html = `
      <p>Αίτημα επαναφοράς κωδικού</p>
      <p>Ο σύνδεσμος ισχύει για ${ttlMinutes} λεπτά:</p>
      <p><a href="${url}">${url}</a></p>
      <p>Αν δεν το ζήτησες εσύ, αγνόησέ το.</p>
    `;

    await this.mailer.send(email, 'Reset your password', html);
    return { ok: true };
  }

  /** -------------------- RESET PASSWORD -------------------- */
  @Post('reset-password')
  async reset(@Body() body: ResetDto) {
    const { token, newPassword } = body;
    if (!token || !newPassword) {
      throw new BadRequestException('Token and newPassword required');
    }

    const prt = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });
    if (!prt) throw new BadRequestException('Invalid token');
    if (prt.usedAt) throw new BadRequestException('Token already used');
    if (prt.expiresAt < new Date())
      throw new BadRequestException('Token expired');

    const hash = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: prt.userId },
        data: { passwordHash: hash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: prt.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  /** -------------------- ME -------------------- */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser() user: { sub: number; role: string }) {
    const me = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        id: true,
        email: true,
        role: true,
        company: { select: { id: true, name: true, profileCompleted: true } },
        candidate: {
          select: {
            id: true,
            name: true,
            location: true,
            headline: true,
            about: true,
            avatarUrl: true,
            profileCompleted: true,
            skills: { select: { skill: { select: { name: true } } } },
          },
        },
        subscriptions: {
          where: { status: 'active' },
          orderBy: { id: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            expiresAt: true,
            plan: { select: { name: true, adsEnabled: true, priceCents: true } },
          },
        },
      },
    });
    return me;
  }

  /** -------------------- SEND VERIFY MAIL -------------------- */
  @UseGuards(JwtAuthGuard)
  @Post('send-verify')
  async sendVerify(@CurrentUser() u: { sub: number }) {
    const user = await this.prisma.user.findUnique({ where: { id: u.sub } });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified) return { ok: true };

    const token = crypto.randomBytes(32).toString('hex');
    const ttlMinutes = Number(process.env.EMAIL_VERIFY_TTL_MINUTES ?? 60 * 24);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);

    await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const url = `${process.env.APP_BASE_URL}/auth/verify?token=${token}`;
    const html = `
      <p>Επιβεβαίωση email για JobMatch</p>
      <p>Ο σύνδεσμος ισχύει για ${ttlMinutes} λεπτά.</p>
      <p><a href="${url}">${url}</a></p>
    `;

    await this.mailer.send(user.email, 'Επιβεβαίωση email', html);
    return { ok: true };
  }

  /** -------------------- VERIFY TOKEN -------------------- */
  @Get('verify')
  async verify(@Query('token') token?: string) {
    if (!token) throw new BadRequestException('Missing token');

    const rec = await this.prisma.emailVerificationToken.findUnique({
      where: { token },
    });
    if (!rec) throw new BadRequestException('Invalid token');
    if (rec.usedAt) throw new BadRequestException('Token already used');
    if (rec.expiresAt < new Date()) throw new BadRequestException('Token expired');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: rec.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: rec.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true };
  }

  /** -------------------- SOCIAL: GOOGLE -------------------- */
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  async googleLogin() {
    // Redirect to Google – no handler body
  }

  @Get('google/callback')
@UseGuards(GoogleAuthGuard)
async googleCallback(@Req() req: Request, @Res() res: Response) {
  try {
    const profile: any = (req as any).user;
    const email: string | undefined = profile?.emails?.[0]?.value;
    const name: string = profile?.displayName ?? '';
    const avatar: string | null = profile?.photos?.[0]?.value ?? null;

    if (!email) {
      const front = process.env.APP_BASE_URL || 'http://localhost:3000';
      return res.redirect(`${front}/auth/social?error=${encodeURIComponent('Email not provided by Google')}`);
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        candidate: {
          upsert: {
            update: { name, ...(avatar ? { avatarUrl: avatar } : {}) },
            create: { name, ...(avatar ? { avatarUrl: avatar } : {}) },
          },
        },
        emailVerified: true,
      },
      create: {
        email,
        role: 'CANDIDATE',
        emailVerified: true,
        candidate: {
          create: { name, ...(avatar ? { avatarUrl: avatar } : {}) },
        },
      },
      select: { id: true, role: true },
    });

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    const front = process.env.APP_BASE_URL || 'http://localhost:3000';
    return res.redirect(`${front}/auth/social?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[googleCallback] error:', err);
    const front = process.env.APP_BASE_URL || 'http://localhost:3000';
    return res.redirect(`${front}/auth/social?error=${encodeURIComponent('Internal error')}`);
  }
}

  /** -------------------- SOCIAL: FACEBOOK -------------------- */
  @Get('facebook')
  @UseGuards(FacebookAuthGuard)
  async facebookLogin() {
    // Redirect to Facebook – no handler body
  }

  @Get('facebook/callback')
@UseGuards(FacebookAuthGuard)
async facebookCallback(@Req() req: Request, @Res() res: Response) {
  try {
    const profile: any = (req as any).user;
    const email: string | undefined = profile?.emails?.[0]?.value;
    const name: string = profile?.displayName ?? '';
    const avatar: string | null = profile?.photos?.[0]?.value ?? null;

    if (!email) {
      const front = process.env.APP_BASE_URL || 'http://localhost:3000';
      return res.redirect(`${front}/auth/social?error=${encodeURIComponent('Email not provided by Facebook')}`);
    }

    const user = await this.prisma.user.upsert({
      where: { email },
      update: {
        candidate: {
          upsert: {
            update: { name, ...(avatar ? { avatarUrl: avatar } : {}) },
            create: { name, ...(avatar ? { avatarUrl: avatar } : {}) },
          },
        },
        emailVerified: true,
      },
      create: {
        email,
        role: 'CANDIDATE',
        emailVerified: true,
        candidate: {
          create: { name, ...(avatar ? { avatarUrl: avatar } : {}) },
        },
      },
      select: { id: true, role: true },
    });

    const token = jwt.sign(
      { sub: user.id, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' },
    );

    const front = process.env.APP_BASE_URL || 'http://localhost:3000';
    return res.redirect(`${front}/auth/social?token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('[facebookCallback] error:', err);
    const front = process.env.APP_BASE_URL || 'http://localhost:3000';
    return res.redirect(`${front}/auth/social?error=${encodeURIComponent('Internal error')}`);
  }
}
}
