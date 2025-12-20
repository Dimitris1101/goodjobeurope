/*import { Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import { createReadStream, statSync } from 'fs';
import * as path from 'path';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: 'uploads/avatars',
      filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, unique + extname(file.originalname));
      }
    }),
    fileFilter: (_req, file, cb) => {
      const ok = /image\/(png|jpe?g|webp|gif)/.test(file.mimetype);
      cb(ok ? null : new Error('Invalid file type'), ok);
    },
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  }))
  upload(@UploadedFile() file: Express.Multer.File) {
    const url = `${process.env.APP_BASE_URL}/static/${file.filename}`;
    return { url };
  }
}*/

import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Get,
  Param,
  Res,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Response } from 'express';
import {
  createReadStream,
  statSync,
  existsSync,
  mkdirSync,
} from 'fs';


/* --------- Helpers --------- */

const ROOT = process.cwd();
const AVATAR_DIR = join(ROOT, 'uploads', 'avatars');
const CV_DIR = join(ROOT, 'uploads', 'cv');

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}
ensureDir(AVATAR_DIR);
ensureDir(CV_DIR);

function guessImageContentType(filename: string): string {
  const ext = extname(filename).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.gif') return 'image/gif';
  return 'application/octet-stream';
}

/* ============================================
   UPLOADS (protected με JWT)
============================================ */

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  // -------- Avatar (εικόνα) --------
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureDir(AVATAR_DIR);
          cb(null, AVATAR_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok = /image\/(png|jpe?g|webp|gif)/.test(file.mimetype);
        cb(ok ? null : new BadRequestException('Invalid image type'), ok);
      },
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    // ΕΠΙΣΤΡΕΦΟΥΜΕ relative URL που θα περάσει από /media/avatars/:file
    const url = `/media/avatars/${file.filename}`;
    return { url };
  }

  // -------- CV (PDF) --------
  @Post('cv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          ensureDir(CV_DIR);
          cb(null, CV_DIR);
        },
        filename: (_req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      fileFilter: (_req, file, cb) => {
        const ok = file.mimetype === 'application/pdf';
        cb(ok ? null : new BadRequestException('Only PDF allowed'), ok);
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  uploadCv(@UploadedFile() file: Express.Multer.File) {
    // Relative URL προς τον media controller
    const url = `/media/cv/${file.filename}`;
    return { url };
  }
}

/* ============================================
   MEDIA (public streaming) — ΧΩΡΙΣ GUARD
   - Avatars/images: σωστό Content-Type
   - CV (PDF): Content-Disposition: inline
============================================ */

@Controller('media')
export class MediaController {
  @Get('avatars/:file')
  getAvatar(@Param('file') file: string, @Res() res: Response) {
    const filePath = join(AVATAR_DIR, file);
    if (!existsSync(filePath)) throw new NotFoundException();

    const ct = guessImageContentType(filePath);
    res.setHeader('Content-Type', ct);

    try {
      const stat = statSync(filePath);
      res.setHeader('Content-Length', String(stat.size));
    } catch {}

    createReadStream(filePath).pipe(res);
  }

  @Get('cv/:file')
  getCv(@Param('file') file: string, @Res() res: Response) {
    const filePath = join(CV_DIR, file);
    if (!existsSync(filePath)) throw new NotFoundException();

    // ΚΡΙΣΙΜΟ: inline για να ΑΝΟΙΓΕΙ στον browser
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file)}"`,
    );

    try {
      const stat = statSync(filePath);
      res.setHeader('Content-Length', String(stat.size));
    } catch {}

    createReadStream(filePath).pipe(res);
  }
}