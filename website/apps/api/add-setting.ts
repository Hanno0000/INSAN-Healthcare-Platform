import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  await prisma.setting.upsert({
    where: { key: 'facebook_sync_auto_publish_days' },
    create: {
      key: 'facebook_sync_auto_publish_days',
      group: 'social',
      value: 3
    },
    update: {}
  });
  console.log("Setting added");
}

main().catch(console.error).finally(() => prisma.$disconnect());
