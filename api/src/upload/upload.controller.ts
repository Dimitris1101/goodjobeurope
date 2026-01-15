import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { existsSync, mkdirSync } from 'fs';

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function uploadsRoot(): string {
  return process.env.UPLOADS_DIR || join(process.cwd(), 'uploads');
}

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(uploadsRoot(), 'avatars');
          ensureDir(dir);
          cb(null, dir);
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
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadAvatar(@UploadedFile() file: Express.Multer.File) {
    return { url: `/media/avatars/${file.filename}` };
  }

  @Post('cv')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dir = join(uploadsRoot(), 'cv');
          ensureDir(dir);
          cb(null, dir);
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
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  uploadCv(@UploadedFile() file: Express.Multer.File) {
    return { url: `/media/cv/${file.filename}` };
  }
}

