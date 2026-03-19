import jwt from 'jsonwebtoken';

const jwtSecret = process.env.JWT_SECRET || 'dev-only-change-me';
const expiresIn = Number(process.env.JWT_EXPIRES_IN || 3600);

export function signAccessToken(user) {
  // Keep payload minimal: only include fields needed by clients/services.
  return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, jwtSecret);
}

export function cookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: expiresIn * 1000
  };
}
