import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createUser, findUserByEmail } from '../auth/userStore.js';
import { cookieOptions, signAccessToken } from '../auth/jwt.js';

const router = Router();
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateCredentials(email, password) {
  // Basic scaffold validation; in production, centralize schema validation.
  if (!email || !emailPattern.test(email)) {
    return 'A valid email is required.';
  }

  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  return null;
}

router.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const existingUser = findUserByEmail(email);
  if (existingUser) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  // Hash password before storage to prevent plaintext credential leaks.
  const passwordHash = await bcrypt.hash(password, 12);
  const user = createUser({ email, passwordHash });
  const token = signAccessToken(user);

  // Store token in an httpOnly cookie to reduce XSS token-exfiltration risk.
  res.cookie('token', token, cookieOptions());

  return res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email
    }
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return res.status(400).json({ message: validationError });
  }

  const user = findUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const isValidPassword = await bcrypt.compare(password, user.passwordHash);
  if (!isValidPassword) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const token = signAccessToken(user);
  res.cookie('token', token, cookieOptions());

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email
    }
  });
});

router.post('/logout', (_req, res) => {
  // Clear auth cookie on logout; clients should also clear in-memory/session token state.
  res.clearCookie('token', cookieOptions());
  return res.status(204).send();
});

export default router;
