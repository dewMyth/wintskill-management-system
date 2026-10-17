import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet } from 'jose';
import type { Env } from '../config/env.js';
import { AccountsModule } from '../accounts/accounts.module.js';
import { AuthService } from './auth.service.js';
import { JwtVerifier } from './jwt-verifier.js';
import { MeController } from './me.controller.js';

@Module({
  imports: [AccountsModule],
  controllers: [MeController],
  providers: [
    AuthService,
    {
      provide: JwtVerifier,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const issuer = `${config.get('SUPABASE_URL', { infer: true })}/auth/v1`;
        return new JwtVerifier(
          issuer,
          createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)),
        );
      },
    },
  ],
  exports: [JwtVerifier],
})
export class AuthModule {}
