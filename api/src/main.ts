// main.ts
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { join, extname, basename } from 'path';
import 'dotenv/config';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  // 🔥 IMPORTANT: Stripe webhook MUST receive RAW body.
  // Βάλε το ΠΡΙΝ τυχόν global JSON parsers (αν έχεις elsewhere).
  app.use('/webhooks/stripe', bodyParser.raw({ type: 'application/json' }));

  // ---- Static media ----
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

  app.use(
    '/uploads',
    express.static(join(process.cwd(), 'uploads'), {
      setHeaders: staticPdfHeaders,
    }),
  );

  app.use(
    '/media/cv',
    express.static(join(process.cwd(), 'uploads', 'cv'), {
      setHeaders: forcePdfInline,
    }),
  );

  app.use(
    '/media/reference',
    express.static(join(process.cwd(), 'uploads', 'reference-letters'), {
      setHeaders: forcePdfInline,
    }),
  );

  app.use(
    '/media/avatars',
    express.static(join(process.cwd(), 'uploads', 'avatars')),
  );

  await app.listen(3001);
  console.log('API running on http://localhost:3001');
}

bootstrap();
