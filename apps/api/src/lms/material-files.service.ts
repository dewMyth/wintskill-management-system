import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { fileTypeFromBuffer } from 'file-type';
import type { Env } from '../config/env.js';
import type { MaterialKind } from '../generated/prisma/enums.js';
import { SUPABASE, type Supabase } from '../supabase/supabase.module.js';

const BUCKET = 'materials';
const types: Record<string, { kind: MaterialKind; ext: string }> = {
  'application/pdf': { kind: 'PDF', ext: 'pdf' },
  'video/mp4': { kind: 'VIDEO', ext: 'mp4' },
  'image/jpeg': { kind: 'IMAGE', ext: 'jpg' },
  'image/png': { kind: 'IMAGE', ext: 'png' },
  'image/webp': { kind: 'IMAGE', ext: 'webp' },
};
export type FilePurpose = 'material' | 'assignment';
const allowedKinds: Record<FilePurpose, MaterialKind[]> = {
  material: ['PDF', 'VIDEO', 'IMAGE'],
  assignment: ['PDF', 'IMAGE'],
};

/** Viewing links are short-lived; videos stream in many requests, so theirs last a lesson. */
const VIEW_SECONDS: Record<MaterialKind, number> = {
  PDF: 60,
  IMAGE: 60,
  VIDEO: 2 * 60 * 60,
};

/**
 * Files live in a private bucket. Browsers upload straight to storage with a one-time token
 * (large videos never pass through the API), then the API checks the file's real type before
 * anything points at it.
 */
@Injectable()
export class MaterialFiles {
  /** Largest upload in MB; must not exceed the bucket's own limit. */
  readonly maxMb: number;
  private readonly maxBytes: number;

  constructor(
    @Inject(SUPABASE) private readonly supabase: Supabase,
    config: ConfigService<Env, true>,
  ) {
    this.maxMb = config.get('MATERIAL_MAX_MB', { infer: true });
    this.maxBytes = this.maxMb * 1024 * 1024;
  }

  async uploadUrl(
    folder: string,
    {
      contentType,
      size,
      purpose,
    }: { contentType: string; size: number; purpose: FilePurpose },
  ) {
    const type = types[contentType];
    if (!type || !allowedKinds[purpose].includes(type.kind)) {
      throw new BadRequestException(
        purpose === 'material'
          ? 'Upload a PDF, MP4 video or image'
          : 'Upload a PDF or image',
      );
    }
    if (size > this.maxBytes)
      throw new BadRequestException(`Files can be up to ${this.maxMb} MB`);
    const path = `${folder}/${randomUUID()}.${type.ext}`;
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error) throw error;
    return { path: data.path, token: data.token };
  }

  /**
   * Confirms an uploaded file is in the expected folder and really is what its name says,
   * by reading its first bytes. Removes it otherwise.
   */
  async verify(
    path: string,
    folder: string,
    purpose: FilePurpose,
  ): Promise<MaterialKind> {
    const match = new RegExp(
      `^${folder}/[0-9a-f-]{36}\\.(pdf|mp4|jpg|png|webp)$`,
    ).exec(path);
    if (!match) throw new BadRequestException('Unknown upload');

    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60);
    const head = error
      ? undefined
      : await fetch(data.signedUrl, { headers: { range: 'bytes=0-4099' } });
    if (!head?.ok) throw new BadRequestException('Upload the file first');

    const detected = await fileTypeFromBuffer(
      new Uint8Array(await head.arrayBuffer()),
    );
    const type = detected && types[detected.mime];
    if (
      !type ||
      type.ext !== match[1] ||
      !allowedKinds[purpose].includes(type.kind)
    ) {
      await this.remove(path);
      throw new BadRequestException(
        'The file is not a valid PDF, MP4 video or image',
      );
    }
    return type.kind;
  }

  async viewUrl(path: string, kind: MaterialKind) {
    const { data, error } = await this.supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, VIEW_SECONDS[kind]);
    if (error) throw error;
    return data.signedUrl;
  }

  async remove(path: string) {
    await this.supabase.storage.from(BUCKET).remove([path]);
  }
}
