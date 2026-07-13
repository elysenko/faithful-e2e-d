import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import bcryptjs from 'bcryptjs';
import { createHash } from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined in the environment variables');
}

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function derivePassword(email: string): string {
  return createHash('sha256')
    .update(email + (process.env.SEED_SECRET || 'colossus-seed'))
    .digest('hex')
    .slice(0, 16);
}

const SEED_USERS = [
  { name: 'Admin Name', email: 'admin@example.com', role: 'admin' as const },
  { name: 'User Name',  email: 'user@example.com',  role: 'user'  as const },
];

async function main() {
  for (const u of SEED_USERS) {
    const plainPassword = derivePassword(u.email);
    const hashedPassword = bcryptjs.hashSync(plainPassword, 10);

    await prisma.user.upsert({
      where:  { email: u.email },
      update: { name: u.name, role: u.role, password: hashedPassword },
      create: { name: u.name, email: u.email, password: hashedPassword, role: u.role },
    });

    console.log(`SEED_CRED ${u.role} ${u.email} ${plainPassword}`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
