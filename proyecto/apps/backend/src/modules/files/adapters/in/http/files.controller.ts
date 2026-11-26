import { BadRequestException, Controller, Delete, Get, HttpCode, Param, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MAX_FILE_BYTES } from '@memoratag/contracts';
import { AuthGuard, CurrentUser } from '../../../../identity/adapters/in/http/auth.guard';
import type { CurrentUser as User } from '../../../../identity/domain/current-user';
import { UuidParam } from '../../../../../shared/http';
import { FilesService } from '../../../application/files.service';

@Controller()
@UseGuards(AuthGuard)
export class FilesController {
  constructor(private readonly service: FilesService) {}

  // Multer rejects bodies over the limit with 413 before the use case runs.
  @Post('events/:eventId/files')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_FILE_BYTES, files: 1 } }))
  upload(@CurrentUser() user: User, @Param('eventId', new UuidParam()) eventId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Missing "file" field');
    return this.service.upload(user, eventId, { name: file.originalname, mime: file.mimetype, bytes: file.buffer });
  }

  @Get('files/:fileId/url')
  url(@CurrentUser() user: User, @Param('fileId', new UuidParam()) fileId: string) {
    return this.service.signedUrl(user, fileId);
  }

  @Delete('files/:fileId')
  @HttpCode(204)
  async remove(@CurrentUser() user: User, @Param('fileId', new UuidParam()) fileId: string) {
    await this.service.remove(user, fileId);
  }
}
