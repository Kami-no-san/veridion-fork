import { ForbiddenException } from '@nestjs/common';

import { ReportsService } from './reports.service';

function createPrisma() {
  return {
    db: {
      audit: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    },
  };
}

const audit = {
  id: 'audit-id',
  project: {
    name: 'Example Protocol',
    userId: 'user-id',
    chain: 'ethereum',
    language: 'solidity',
    contracts: [{ name: 'Example.sol', hash: 'contract-hash' }],
  },
  commitHash: 'commit-hash',
  securityScore: 91,
  reportHash: null,
  completedAt: new Date('2026-08-12T12:00:00.000Z'),
  findings: [
    {
      id: 'finding-id',
      auditId: 'audit-id',
      pluginId: 'reentrancy',
      title: 'Reentrancy risk',
      description: 'An external call occurs before state changes.',
      severity: 'HIGH',
      filePath: 'Example.sol',
      lineStart: 10,
      lineEnd: 14,
      codeSnippet: 'withdraw();',
      recommendation: 'Use checks-effects-interactions.',
      aiSummary: 'The state update should happen before the external call.',
      confidence: 0.95,
      references: [],
      status: 'OPEN',
      assignedToId: null,
      createdAt: new Date('2026-08-12T12:00:00.000Z'),
      updatedAt: new Date('2026-08-12T12:00:00.000Z'),
    },
  ],
};

describe('ReportsService', () => {
  const prisma = createPrisma();
  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(prisma as never);
    prisma.db.audit.findUnique.mockResolvedValue(audit);
    prisma.db.audit.update.mockResolvedValue({});
  });

  it('generates JSON through the shared formatter and can omit AI summaries', async () => {
    const result = await service.generate('user-id', {
      auditId: 'audit-id',
      format: 'JSON',
      includeAiSummary: false,
    });

    const content = JSON.parse(result.content) as {
      findings: Array<{ aiSummary?: string | null }>;
    };
    expect(result.contentType).toBe('application/json');
    expect(result.fileExtension).toBe('json');
    expect(content.findings[0]?.aiSummary).toBeNull();
    expect(prisma.db.audit.update).toHaveBeenCalledWith({
      where: { id: 'audit-id' },
      data: { reportHash: 'report-audit-id' },
    });
  });

  it('prevents users from generating reports for another user', async () => {
    await expect(
      service.generate('another-user', {
        auditId: 'audit-id',
        format: 'MARKDOWN',
        includeAiSummary: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.db.audit.update).not.toHaveBeenCalled();
  });

  it('scopes history to the current user', async () => {
    prisma.db.audit.findMany.mockResolvedValue([]);

    await expect(service.list('user-id')).resolves.toEqual([]);
    expect(prisma.db.audit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { project: { userId: 'user-id' }, reportHash: { not: null } },
      }),
    );
  });
});
