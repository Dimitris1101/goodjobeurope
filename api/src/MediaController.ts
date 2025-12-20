import { Controller, Get, Param, Res, NotFoundException } from '@nestjs/common';
import { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const CV_DIR = join(ROOT, 'uploads', 'cv');
const AVATAR_DIR = join(ROOT, 'uploads', 'avatars');

function guessImageContentType(filename: string): string {
  const ext = filename.toLowerCase();
  if (ext.endsWith('.png')) return 'image/png';
  if (ext.endsWith('.jpg') || ext.endsWith('.jpeg')) return 'image/jpeg';
  if (ext.endsWith('.webp')) return 'image/webp';
  if (ext.endsWith('.gif')) return 'image/gif';
  return 'application/octet-stream';
}

@Controller('media')
export class MediaController {
  @Get('avatars/:file')
  getAvatar(@Param('file') file: string, @Res() res: Response) {
    const filePath = join(AVATAR_DIR, file);
    if (!existsSync(filePath)) throw new NotFoundException();

    res.setHeader('Content-Type', guessImageContentType(file));
    try {
      const st = statSync(filePath);
      res.setHeader('Content-Length', String(st.size));
    } catch {}
    createReadStream(filePath).pipe(res);
  }

  @Get('cv/:file')
  getCv(@Param('file') file: string, @Res() res: Response) {
    const filePath = join(CV_DIR, file);
    if (!existsSync(filePath)) throw new NotFoundException();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(file)}"`);
    try {
      const st = statSync(filePath);
      res.setHeader('Content-Length', String(st.size));
    } catch {}
    createReadStream(filePath).pipe(res);
  }
}