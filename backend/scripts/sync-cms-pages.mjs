import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env.js';
import { syncCmsPages } from '../prisma/site-pages.js';

const prisma = new PrismaClient();

async function main() {
  await syncCmsPages(prisma, { rootDir: env.PUBLIC_ROOT });
  console.log('CMS pages synced from legacy HTML pages.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
