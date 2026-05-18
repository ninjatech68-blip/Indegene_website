import { PrismaClient } from '@prisma/client';
import { env } from '../src/config/env.js';
import { syncCaseStudyDetails } from '../prisma/case-study-details.js';

const prisma = new PrismaClient();

async function main() {
  await syncCaseStudyDetails(prisma, { rootDir: env.PUBLIC_ROOT });
  console.log('Case study details synced from generated HTML pages.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
