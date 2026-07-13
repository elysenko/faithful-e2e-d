'use strict';
/**
 * Production seed — runs with plain `node`, no TypeScript toolchain needed.
 * Uses @prisma/client (generated into node_modules at build time via `npx prisma generate`).
 *
 * Usage:  node prisma/seed/seed.js
 * Called by: npx prisma db seed (package.json "prisma.seed") and by the Colossus
 *            deploy pipeline's sync_seed_credentials activity.
 *
 * Creates demo login users WITH hashed passwords (template-web ships bcryptjs auth)
 * and emits their credentials so Colossus can surface them. Idempotent: re-running
 * re-hashes the same derived password, so the emitted credential always logs in.
 *
 * Emission contract (parsed by colossus seed_creds.parse_seed_credentials):
 *   SEED_CREDS_JSON=[{"role":"admin","email":"...","password":"..."}, ...]
 * Keep this — without it the deployment shows no demo credentials. See coder.md.
 */
const { PrismaClient } = require('@prisma/client');
const { createHash } = require('crypto');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Deterministic per-email password so re-seeding yields the same working credential.
function derivePassword(email) {
  return createHash('sha256')
    .update(email + (process.env.SEED_SECRET || 'colossus-seed'))
    .digest('hex')
    .slice(0, 16);
}

const SEED_USERS = [
  { email: 'admin@example.com', name: 'Admin User',   role: 'admin' },
  { email: 'user@example.com',  name: 'Regular User', role: 'user'  },
];

async function main() {
  const emitted = [];
  for (const u of SEED_USERS) {
    const password = derivePassword(u.email);
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, password: passwordHash },
      create: { email: u.email, name: u.name, role: u.role, password: passwordHash },
    });
    emitted.push({ role: u.role, email: u.email, password });
  }
  // Structured form (preferred). Colossus parses this line to surface demo logins.
  console.log(`SEED_CREDS_JSON=${JSON.stringify(emitted)}`);
}

main()
  .catch((error) => {
    console.error('Seed failed:', error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
