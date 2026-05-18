import { prisma } from '../src/lib/prisma.js';
import { getWebsitePages } from '../src/services/frontend-map.js';

async function run() {
  const homePage = await prisma.page.findUnique({
    where: { slug: 'home' },
    include: {
      sections: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
      }
    }
  });

  if (!homePage) {
    throw new Error('Home page record not found.');
  }

  const mappedKeys = new Set(getWebsitePages().find((page) => page.slug === 'home')?.sections || []);
  const staleSections = homePage.sections.filter((section) => !mappedKeys.has(section.sectionKey));
  const sortedKeys = Array.from(mappedKeys);

  if (staleSections.length) {
    await prisma.pageSection.deleteMany({
      where: { id: { in: staleSections.map((section) => section.id) } }
    });
  }

  const retained = await prisma.pageSection.findMany({
    where: { pageId: homePage.id, sectionKey: { in: sortedKeys } },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
  });

  for (const section of retained) {
    const targetOrder = sortedKeys.indexOf(section.sectionKey) + 1;
    if (targetOrder > 0 && section.sortOrder !== targetOrder) {
      await prisma.pageSection.update({
        where: { id: section.id },
        data: { sortOrder: targetOrder }
      });
    }
  }

  const finalSections = await prisma.pageSection.findMany({
    where: { pageId: homePage.id },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: { sectionKey: true, sortOrder: true }
  });

  console.log(JSON.stringify({
    removed: staleSections.map((section) => section.sectionKey),
    final: finalSections
  }, null, 2));
}

run()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
