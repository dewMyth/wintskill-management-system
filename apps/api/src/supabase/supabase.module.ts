import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';

/** Server-side Supabase client (secret key). Never expose it to the browser. */
export const SUPABASE = Symbol('SUPABASE');
export type Supabase = SupabaseClient;

export function createServerClient(config: ConfigService<Env, true>): Supabase {
  return createClient(
    config.get('SUPABASE_URL', { infer: true }),
    config.get('SUPABASE_SECRET_KEY', { infer: true }),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

@Global()
@Module({
  providers: [{ provide: SUPABASE, useFactory: createServerClient, inject: [ConfigService] }],
  exports: [SUPABASE],
})
export class SupabaseModule {}
