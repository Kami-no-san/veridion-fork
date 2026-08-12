import { PrismaClient } from '../src/generated/client';

const prisma = new PrismaClient();

const adminId = '00000000-0000-4000-8000-000000000001';
const userId = '00000000-0000-4000-8000-000000000002';

const projects = [
  {
    id: '00000000-0000-4000-8000-000000000101',
    name: 'Veridion DeFi Registry',
    description: 'Reference DeFi contracts used for security regression testing.',
    repoUrl: 'https://github.com/VeridionLabs/veridion',
    chain: 'stellar',
    language: 'rust',
    userId: adminId,
  },
  {
    id: '00000000-0000-4000-8000-000000000102',
    name: 'Community Token',
    description: 'A sample ERC-20 style token project.',
    repoUrl: 'https://github.com/example/community-token',
    chain: 'ethereum',
    language: 'solidity',
    userId,
  },
  {
    id: '00000000-0000-4000-8000-000000000103',
    name: 'NFT Marketplace',
    description: 'Sample marketplace contracts for local development.',
    repoUrl: 'https://github.com/example/nft-marketplace',
    chain: 'polygon',
    language: 'solidity',
    userId,
  },
];

const audits = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    projectId: projects[0].id,
    status: 'COMPLETED',
    securityScore: 92,
    commitHash: 'a1b2c3d4',
    reportHash: 'sha256:sample-report-201',
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    projectId: projects[0].id,
    status: 'VERIFIED',
    securityScore: 87,
    commitHash: 'e5f6a7b8',
    reportHash: 'sha256:sample-report-202',
    transactionHash: 'sample-stellar-transaction-202',
    chainStatus: 'SUCCESS',
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    projectId: projects[1].id,
    status: 'COMPLETED',
    securityScore: 74,
    commitHash: 'c9d0e1f2',
    reportHash: 'sha256:sample-report-203',
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    projectId: projects[1].id,
    status: 'SCANNING',
    securityScore: null,
    commitHash: '12345678',
  },
  {
    id: '00000000-0000-4000-8000-000000000205',
    projectId: projects[2].id,
    status: 'FAILED',
    securityScore: null,
    error: 'Sample failed audit for error-state development testing.',
  },
];

const findings = [
  {
    id: '00000000-0000-4000-8000-000000000301',
    auditId: audits[0].id,
    pluginId: 'reentrancy',
    title: 'External call before state update',
    description: 'An external call occurs before the user balance is updated.',
    severity: 'HIGH',
    filePath: 'contracts/Pool.sol',
    lineStart: 42,
    lineEnd: 49,
    recommendation: 'Apply the checks-effects-interactions pattern.',
    status: 'OPEN',
  },
  {
    id: '00000000-0000-4000-8000-000000000302',
    auditId: audits[0].id,
    pluginId: 'access-control',
    title: 'Missing access control',
    description: 'A privileged function can be called by any account.',
    severity: 'CRITICAL',
    filePath: 'contracts/Admin.sol',
    lineStart: 18,
    lineEnd: 25,
    recommendation: 'Restrict the function to an owner or audited role.',
    status: 'ACKNOWLEDGED',
  },
  {
    id: '00000000-0000-4000-8000-000000000303',
    auditId: audits[1].id,
    pluginId: 'overflow',
    title: 'Unchecked arithmetic operation',
    description: 'Arithmetic may overflow when processing untrusted input.',
    severity: 'MEDIUM',
    filePath: 'contracts/Rewards.sol',
    lineStart: 77,
    lineEnd: 80,
    recommendation: 'Validate bounds before performing the calculation.',
    status: 'RESOLVED',
  },
  {
    id: '00000000-0000-4000-8000-000000000304',
    auditId: audits[2].id,
    pluginId: 'oracle',
    title: 'Stale oracle data',
    description: 'The price feed value is used without checking its update time.',
    severity: 'HIGH',
    filePath: 'src/Oracle.sol',
    lineStart: 101,
    lineEnd: 108,
    recommendation: 'Reject values older than the configured freshness window.',
    status: 'OPEN',
  },
  {
    id: '00000000-0000-4000-8000-000000000305',
    auditId: audits[2].id,
    pluginId: 'gas',
    title: 'Repeated storage read in loop',
    description: 'A loop repeatedly reads an unchanged storage value.',
    severity: 'LOW',
    filePath: 'src/Marketplace.sol',
    lineStart: 55,
    lineEnd: 63,
    recommendation: 'Cache the value in memory before iterating.',
    status: 'FALSE_POSITIVE',
  },
];

async function main() {
  await prisma.user.upsert({
    where: { id: adminId },
    update: { email: 'admin@veridion.local', displayName: 'Veridion Admin', role: 'ADMIN' },
    create: {
      id: adminId,
      email: 'admin@veridion.local',
      passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      displayName: 'Veridion Admin',
      role: 'ADMIN',
    },
  });

  await prisma.user.upsert({
    where: { id: userId },
    update: { email: 'developer@veridion.local', displayName: 'Sample Developer', role: 'USER' },
    create: {
      id: userId,
      email: 'developer@veridion.local',
      passwordHash: '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
      displayName: 'Sample Developer',
      role: 'USER',
    },
  });

  for (const project of projects) {
    await prisma.project.upsert({
      where: { id: project.id },
      update: project,
      create: project,
    });
  }

  for (const audit of audits) {
    await prisma.audit.upsert({
      where: { id: audit.id },
      update: audit,
      create: audit,
    });
  }

  for (const finding of findings) {
    await prisma.auditFinding.upsert({
      where: { id: finding.id },
      update: finding,
      create: finding,
    });
  }

  const notifications = [
    {
      id: '00000000-0000-4000-8000-000000000401',
      userId: adminId,
      title: 'Audit completed',
      message: 'The Veridion DeFi Registry audit is ready to review.',
      type: 'SUCCESS',
      link: '/dashboard/audits/00000000-0000-4000-8000-000000000201',
    },
    {
      id: '00000000-0000-4000-8000-000000000402',
      userId,
      title: 'Finding requires attention',
      message: 'A critical finding was detected in Community Token.',
      type: 'WARNING',
      link: '/dashboard/projects/00000000-0000-4000-8000-000000000102',
    },
  ];

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: { id: notification.id },
      update: notification,
      create: notification,
    });
  }

  console.log(
    `Seeded ${2} users, ${projects.length} projects, ${audits.length} audits, ${findings.length} findings, and ${notifications.length} notifications.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    throw error;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
