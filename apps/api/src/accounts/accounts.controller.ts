import {
  BadRequestException,
  Body,
  Controller,
  FileTypeValidator,
  HttpCode,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsBoolean } from 'class-validator';
import { CurrentUser, Roles } from '../auth/decorators.js';
import type { Profile } from '../generated/prisma/client.js';
import { AccountsService } from './accounts.service.js';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

class SetStatusDto {
  @IsBoolean()
  isActive: boolean;
}

/** Admin actions that apply to any login: password reset, (de)activation, photo. */
@Controller('accounts/:id')
@Roles('ADMIN')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Post('reset-password')
  @HttpCode(200)
  resetPassword(@Param('id', ParseUUIDPipe) id: string) {
    return this.accounts.resetPassword(id);
  }

  @Patch('status')
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetStatusDto,
    @CurrentUser() me: Profile,
  ) {
    if (id === me.id && !dto.isActive)
      throw new BadRequestException('You cannot deactivate your own account');
    return this.accounts.setActive(id, dto.isActive);
  }

  @Put('photo')
  @UseInterceptors(
    FileInterceptor('photo', {
      limits: { fileSize: MAX_PHOTO_BYTES, files: 1 },
    }),
  )
  setPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: MAX_PHOTO_BYTES,
            message: 'Photo must be 2 MB or smaller',
          }),
          // Checks the file's actual bytes, not just the name or the type the browser claims.
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|webp)$/ }),
        ],
      }),
    )
    photo: Express.Multer.File,
  ) {
    return this.accounts.setPhoto(id, photo);
  }
}
