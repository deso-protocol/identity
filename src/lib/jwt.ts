import * as jws from 'jws';

const JWT_ALGORITHM = 'ES256';
const JWT_TYPE = 'JWT';
const EXPIRATION_PATTERN =
  /^\s*(\d+(?:\.\d+)?)\s*(seconds?|minutes?|hours?|days?)\s*$/i;
const SECONDS_PER_UNIT: Record<string, number> = {
  second: 1,
  seconds: 1,
  minute: 60,
  minutes: 60,
  hour: 60 * 60,
  hours: 60 * 60,
  day: 24 * 60 * 60,
  days: 24 * 60 * 60,
};

export interface JwtPayload {
  [claim: string]: unknown;
  exp: number;
  iat: number;
}

export function signJwtES256(
  payload: Record<string, unknown>,
  encodedPrivateKey: string,
  expiresIn: string | number
): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expirationSeconds = parseExpirationSeconds(expiresIn);

  return jws.sign({
    header: { alg: JWT_ALGORITHM, typ: JWT_TYPE },
    payload: JSON.stringify({
      ...payload,
      iat: issuedAt,
      exp: issuedAt + expirationSeconds,
    }),
    privateKey: encodedPrivateKey,
  });
}

export function verifyJwtES256(
  token: string,
  encodedPublicKey: string,
  nowSeconds = Math.floor(Date.now() / 1000)
): JwtPayload {
  const decoded = jws.decode(token, { json: true });
  if (
    !decoded ||
    decoded.header?.alg !== JWT_ALGORITHM ||
    decoded.header?.typ !== JWT_TYPE
  ) {
    throw new Error('JWT must use ES256');
  }
  if (!jws.verify(token, JWT_ALGORITHM, encodedPublicKey)) {
    throw new Error('JWT signature is invalid');
  }

  const payload = decoded.payload as Partial<JwtPayload>;
  if (
    !payload ||
    typeof payload !== 'object' ||
    !Number.isSafeInteger(payload.iat) ||
    !Number.isSafeInteger(payload.exp) ||
    (payload.exp as number) <= nowSeconds
  ) {
    throw new Error('JWT claims are invalid or expired');
  }

  return payload as JwtPayload;
}

function parseExpirationSeconds(expiresIn: string | number): number {
  if (typeof expiresIn === 'number') {
    if (!Number.isSafeInteger(expiresIn) || expiresIn <= 0) {
      throw new Error('JWT expiration must be a positive integer');
    }
    return expiresIn;
  }

  const match = EXPIRATION_PATTERN.exec(expiresIn);
  if (!match) {
    throw new Error('JWT expiration format is invalid');
  }
  const value = Number(match[1]);
  const seconds = value * SECONDS_PER_UNIT[match[2].toLowerCase()];
  if (!Number.isSafeInteger(seconds) || seconds <= 0) {
    throw new Error('JWT expiration must resolve to whole positive seconds');
  }
  return seconds;
}
