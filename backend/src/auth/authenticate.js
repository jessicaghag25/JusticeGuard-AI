import { verifyAccessToken } from './jwt.js';

function getBearerToken(headerValue) {
  if (!headerValue || !headerValue.startsWith('Bearer ')) {
    return null;
  }

  return headerValue.slice('Bearer '.length);
}

export function authenticateRequest(req, res, next) {
  // Prefer Authorization header for API clients, then fallback to secure cookie.
  const headerToken = getBearerToken(req.headers.authorization);
  const cookieToken = req.cookies?.token;
  const token = headerToken || cookieToken;

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is required.' });
  }

  try {
    req.auth = verifyAccessToken(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}
