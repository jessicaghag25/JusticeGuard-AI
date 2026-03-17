import { randomUUID } from 'node:crypto';

// In-memory user store for scaffold purposes only.
// TODO: Replace with a database model (e.g., PostgreSQL + Prisma) in production.
const usersByEmail = new Map();

export function findUserByEmail(email) {
  return usersByEmail.get(email.toLowerCase()) || null;
}

export function createUser({ email, passwordHash }) {
  const normalizedEmail = email.toLowerCase();
  const user = {
    id: randomUUID(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString()
  };

  usersByEmail.set(normalizedEmail, user);
  return user;
}
