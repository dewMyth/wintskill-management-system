import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Env } from '../config/env.js';

/** Server-side Supabase client (secret key). Never expose it to the browser. */
export const SUPABASE = Symbol('SUPABASE');
export type Supabase = SupabaseClient;

/** No Supabase call may hang: registration holds the intake's number counter while it waits. */
const REQUEST_TIMEOUT_MS = 10_000;
const fetchWithTimeout: typeof fetch = (input, init) => {
  const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  return fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal, timeout]) : timeout });
};

export function createServerClient(config: ConfigService<Env, true>): Supabase {
  return createClient(
    config.get('SUPABASE_URL', { infer: true }),
    config.get('SUPABASE_SECRET_KEY', { infer: true }),
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: fetchWithTimeout },
    },
  );
}

@Global()
@Module({
  providers: [{ provide: SUPABASE, useFactory: createServerClient, inject: [ConfigService] }],
  exports: [SUPABASE],
})
export class SupabaseModule {}
