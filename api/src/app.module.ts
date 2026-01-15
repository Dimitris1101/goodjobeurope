import { Module } from '@nestjs/common';
import { AuthController } from './auth/auth.controller';
import { AdminController } from './admin/admin.controller';
import { MeController } from './me.controller';
import { PrismaService } from './prisma.service';
import { MailerService } from './mailer.service';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { RolesGuard } from './auth/roles.guard';
import { BillingController } from './billing/billing.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadModule } from './upload/upload.module';
import { CompanyModule } from './company/company.module';
import { CandidateModule } from './candidate/candidate.module';
import { ConversationsModule } from './conversations/conversations.module';
import { MatchesModule } from './matches/matches.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { ChatGateway } from './conversations/chat.gateway';
import { MailerModule } from './mailer/mailer.module';
import { LocationService } from './location/location.service';
import { JobsController } from './jobs.controller';
import { TranslationController } from './translation/translation.controller';
import { TranslationService } from './translation/translation.service';
import { GoogleStrategy } from './auth/google.strategy';
import { FacebookStrategy } from './auth/facebook.strategy';
import { PassportModule } from '@nestjs/passport';
import { StripeModule } from './stripe/stripe.module';
import { InvoiceModule } from './invoice/invoice.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ProviderTestController } from './provider/provider.test.controller';
import { EtimologieraProviderService } from './provider/etimologiera-provider.service';
import { BillingModule } from './billing/billing.module';
import { SubscriptionLockGuard } from './auth/subscription-lock.guard';
import { R2Service } from './r2/r2.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    InvoiceModule,
    BillingModule,
    StripeModule,
    ConfigModule.forRoot({ isGlobal: true }),
    PassportModule.register({ session: false }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),

    CandidateModule,
    ConversationsModule,
    MatchesModule,
    CompanyModule,
    UploadModule,
    MailerModule,

    ServeStaticModule.forRoot({
  rootPath: join(process.cwd(), 'uploads'),
  serveRoot: '/uploads',
}),
  ],
  controllers: [
    AuthController,
    AdminController,
    MeController,
    JobsController,
    ProviderTestController,
    TranslationController,
  ],
  providers: [
    PrismaService,
    R2Service,
    LocationService,
    TranslationService,
    MailerService,
    ChatGateway,
    Reflector,
    GoogleStrategy,
    EtimologieraProviderService,
    FacebookStrategy,
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: SubscriptionLockGuard },
  ],
})
export class AppModule {}