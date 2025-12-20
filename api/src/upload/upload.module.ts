import { Module } from '@nestjs/common';
import { UploadController, MediaController } from './upload.controller';

@Module({
  controllers: [UploadController, MediaController],
})
export class UploadModule {}
