import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

loadEnv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL must be configured. See .env.example.');
export const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
export { Prisma } from '@prisma/client';
