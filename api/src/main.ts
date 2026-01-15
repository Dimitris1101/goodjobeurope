// src/main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join, extname, basename } from 'path';
import 'dotenv/config';
import * as bodyParser from 'body-parser';

/* ---------------- Helpers (must be declared BEFORE use) ---------------- */

const staticPdfHeaders = (res: any, filePath: string) => {
  const isPdf = extname(filePath).toLowerCase() === '.pdf';
  if (isPdf) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${basename(filePath)}"`,
    );
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
};

const forcePdfInline = (res: any, filePath: string) => {
  const name = basename(filePath);
  const safeName = name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${safeName}"`);
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
};

/* ---------------------------------------------------------------------- */

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const appBase = process.env.APP_BASE_URL || 'https://goodjobeurope.com';

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  appBase,
  appBase.replace('://', '://www.'),
  'https://www.goodjobeurope.com',
].filter(Boolean);

  app.enableCors({
    origin: (
      origin: string | undefined,
      cb: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin) return cb(null, true); // server-to-server / curl
      if (allowedOrigins.includes(origin)) return cb(null, true);
      return cb(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    credentials: true,
  });

  // Stripe webhook MUST receive RAW body (before any json parser)
  app.use('/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));

  // ---- Static media ----
  const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');

  // Canonical public endpoints
  app.use('/media/avatars', express.static(join(uploadsDir, 'avatars')));
  app.use(
    '/media/cv',
    express.static(join(uploadsDir, 'cv'), { setHeaders: forcePdfInline }),
  );
  app.use(
    '/media/reference',
    express.static(join(uploadsDir, 'reference-letters'), {
      setHeaders: forcePdfInline,
    }),
  );
  app.use(
    '/media/company-logos',
    express.static(join(uploadsDir, 'company-logos')),
  );
  app.use(
    '/media/company-covers',
    express.static(join(uploadsDir, 'company-covers')),
  );

  // (Optional) expose /uploads (usually OFF in production)
  // app.use('/uploads', express.static(uploadsDir, { setHeaders: staticPdfHeaders }));

  const port = Number(process.env.PORT || 4000);
  await app.listen(port, '0.0.0.0');
  console.log(`API listening on ${port}`);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});

