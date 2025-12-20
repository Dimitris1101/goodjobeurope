import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1) Skills
  const skills = [
    'JavaScript','TypeScript','React','Node.js','Express','NestJS',
    'Next.js','HTML','CSS','Tailwind','PostgreSQL','MySQL',
    'MongoDB','Redis','Docker','Git','Python','Django','FastAPI','AWS'
  ];
  for (const name of skills) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log('Seeded skills ✅');

  // 2) Plans (βάλε ό,τι ονόματα θες – προτείνω όλα UPPER)
  await prisma.plan.createMany({
    data: [
      { name: 'FREE',         priceCents: 0,    adsEnabled: false },
      { name: 'STANDARD',     priceCents: 1700, adsEnabled: false },
      { name: 'PROFESSIONAL', priceCents: 2900, adsEnabled: true  },
      { name: 'ENTERPRISE',   priceCents: 5900, adsEnabled: true  },
    ],
    skipDuplicates: true,
  });
  console.log('Seeded plans ✅');
}

main()
  .catch((e) => {
    console.error(e);
    // αν σου γκρινιάζει για το process, δες τις οδηγίες παρακάτω
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });