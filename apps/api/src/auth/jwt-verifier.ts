import { jwtVerify, type JWTVerifyGetKey } from 'jose';

/** Verifies Supabase access tokens and returns the auth user id. */
export class JwtVerifier {
  constructor(
    private readonly issuer: string,
    private readonly keys: JWTVerifyGetKey,
  ) {}

  async verify(token: string): Promise<string> {
    const { payload } = await jwtVerify(token, this.keys, {
      issuer: this.issuer,
      audience: 'authenticated',
      requiredClaims: ['sub'],
    });
    return payload.sub!;
  }
}
