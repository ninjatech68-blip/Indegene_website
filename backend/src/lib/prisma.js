import { PrismaClient } from '@prisma/client';

export const prisma = globalThis.__ocoPrisma || new PrismaClient();

if (!globalThis.__ocoPrisma) {
  globalThis.__ocoPrisma = prisma;
}
