const { PrismaClient, Role } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Skills
  const skills = [
    'JavaScript','TypeScript','React','Node.js','Express','NestJS',
    'Next.js','HTML','CSS','Tailwind','PostgreSQL','MySQL',
    'MongoDB','Redis','Docker','Git','Python','Django','FastAPI','AWS'
  ];
  for (const name of skills) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Plans (τα ονόματα που θες στο project)
  const plans = ['FREE','VIP MEMBER','ΑΠΛΗ','SILVER','GOLDEN'];
  for (const name of plans) {
    await prisma.plan.upsert({ where: { name }, update: {}, create: { name } });
  }

  // Demo candidate user + profile
  const candUser = await prisma.user.upsert({
    where: { email: 'candidate@test.local' },
    update: {},
    create: { email: 'candidate@test.local', passwordHash: 'dev', role: Role.CANDIDATE },
  });

  const candidate = await prisma.candidate.upsert({
    where: { userId: candUser.id },
    update: {},
    create: {
      userId: candUser.id,
      name: 'Demo Candidate',
      location: 'Athens',
      headline: 'Junior Developer',
      skillsText: 'React,Node,SQL',
      gender: 'MALE',
      countryOfOrigin: 'GR',
      driverLicenseA: true,
      driverLicenseM: false,
      preferredLanguage: 'el',
      profileCompleted: true,
    },
  });

  await prisma.candidateLanguage.createMany({
    data: [
      { candidateId: candidate.id, name: 'Greek',   level: 'C2' },
      { candidateId: candidate.id, name: 'English', level: 'B2' },
    ],
    skipDuplicates: true,
  });

  // Demo company
  const compUser = await prisma.user.upsert({
    where: { email: 'company@test.local' },
    update: {},
    create: { email: 'company@test.local', passwordHash: 'dev', role: Role.COMPANY },
  });

  await prisma.company.upsert({
    where: { userId: compUser.id },
    update: {},
    create: {
      userId: compUser.id,
      name: 'Demo Company',
      country: 'GR',
      website: 'https://example.com',
      about: 'We build great things.',
      profileCompleted: true,
    },
  });

  console.log('Seed OK ✅');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });