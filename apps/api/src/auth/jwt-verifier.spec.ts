import {
  createLocalJWKSet,
  exportJWK,
  generateKeyPair,
  SignJWT,
  type CryptoKey,
} from 'jose';
import { JwtVerifier } from './jwt-verifier.js';

const issuer = 'http://supabase.test/auth/v1';
let privateKey: CryptoKey;
let verifier: JwtVerifier;

beforeAll(async () => {
  const keys = await generateKeyPair('ES256');
  privateKey = keys.privateKey;
  const jwk = { ...(await exportJWK(keys.publicKey)), kid: 'k1', alg: 'ES256' };
  verifier = new JwtVerifier(issuer, createLocalJWKSet({ keys: [jwk] }));
});

function sign(claims: {
  iss?: string;
  aud?: string;
  sub?: string;
  exp?: string | number;
}) {
  const jwt = new SignJWT({}).setProtectedHeader({ alg: 'ES256', kid: 'k1' });
  if (claims.sub) jwt.setSubject(claims.sub);
  return jwt
    .setIssuer(claims.iss ?? issuer)
    .setAudience(claims.aud ?? 'authenticated')
    .setIssuedAt()
    .setExpirationTime(claims.exp ?? '1h')
    .sign(privateKey);
}

describe('JwtVerifier', () => {
  it('returns the subject of a valid token', async () => {
    await expect(verifier.verify(await sign({ sub: 'user-1' }))).resolves.toBe(
      'user-1',
    );
  });

  it.each([
    ['expired', { sub: 'u', exp: Math.floor(Date.now() / 1000) - 60 }],
    ['wrong issuer', { sub: 'u', iss: 'http://evil.test/auth/v1' }],
    ['wrong audience', { sub: 'u', aud: 'anon' }],
    ['missing subject', {}],
  ])('rejects a token with %s', async (_, claims) => {
    await expect(verifier.verify(await sign(claims))).rejects.toThrow();
  });

  it('rejects a token signed with another key', async () => {
    const other = await generateKeyPair('ES256');
    const token = await new SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: 'k1' })
      .setSubject('u')
      .setIssuer(issuer)
      .setAudience('authenticated')
      .setExpirationTime('1h')
      .sign(other.privateKey);
    await expect(verifier.verify(token)).rejects.toThrow();
  });
});
