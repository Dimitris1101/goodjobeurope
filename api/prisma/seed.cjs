const { PrismaClient, Role } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // ---------------- SKILLS ----------------
  const skills = [
    'JavaScript','TypeScript','React','Node.js','Express','NestJS',
    'Next.js','HTML','CSS','Tailwind','PostgreSQL','MySQL',
    'MongoDB','Redis','Docker','Git','Python','Django','FastAPI','AWS'
  ];
  for (const name of skills) {
    await prisma.skill.upsert({ where: { name }, update: {}, create: { name } });
  }

  const silverPlan = await prisma.plan.findUnique({ where: { name: 'SILVER' } });

if (silverPlan) {
  await prisma.subscription.create({
    data: {
      userId: compUser.id,
      planId: silverPlan.id,
      status: 'active', // enum value
      stripeCustomerId: 'demo_customer',
      stripeSubscriptionId: `demo_sub_${compUser.id}`,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  }).catch(() => {});
}

  // ---------------- PLANS (CANONICAL) ----------------
  const plans = [
    {
      name: 'FREE_MEMBER',
      adIntervalSec: 20,
      adMaxPerDay: null,
      companyAdsMax: null,
      companyMatchupsPerDay: null,
      candidateLikesPerDay: 10,
      canUploadProfilePhoto: false,
    },
    {
      name: 'VIP_MEMBER',
      adIntervalSec: 0,
      adMaxPerDay: 0,
      companyAdsMax: null,
      companyMatchupsPerDay: null,
      candidateLikesPerDay: null,
      canUploadProfilePhoto: true,
    },
    {
      name: 'COMPANY_SILVER',
      adIntervalSec: 20,
      adMaxPerDay: 5,
      companyAdsMax: 5,
      companyMatchupsPerDay: 5,
      candidateLikesPerDay: null,
      canUploadProfilePhoto: false,
    },
    {
      name: 'COMPANY_GOLDEN',
      adIntervalSec: 60,
      adMaxPerDay: 10,
      companyAdsMax: 10,
      companyMatchupsPerDay: 15,
      candidateLikesPerDay: null,
      canUploadProfilePhoto: false,
    },
    {
      name: 'COMPANY_PLATINUM',
      adIntervalSec: 0,
      adMaxPerDay: 0,
      companyAdsMax: null,
      companyMatchupsPerDay: null,
      candidateLikesPerDay: null,
      canUploadProfilePhoto: false,
    },
  ];

  for (const p of plans) {
    await prisma.plan.upsert({
      where: { name: p.name },
      update: p,
      create: p,
    });
  }

  // ---------------- DEMO CANDIDATE ----------------
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
      profileCompleted: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: 1 },
    update: {},
    create: {
      userId: candUser.id,
      plan: { connect: { name: 'VIP_MEMBER' } },
      status: 'active',
    },
  });

  // ---------------- DEMO COMPANY ----------------
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
      profileCompleted: true,
    },
  });

  await prisma.subscription.upsert({
    where: { id: 2 },
    update: {},
    create: {
      userId: compUser.id,
      plan: { connect: { name: 'COMPANY_SILVER' } },
      status: 'active',
    },
  });

  console.log('Seed OK ✅');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
