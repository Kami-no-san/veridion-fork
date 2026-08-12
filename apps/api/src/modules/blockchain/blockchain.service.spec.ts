/* eslint-disable @typescript-eslint/unbound-method */

import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { BlockchainService } from './blockchain.service';
import type { SorobanClient } from './soroban-client';

function createPrisma() {
  return {
    db: {
      audit: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    },
  };
}

describe('BlockchainService', () => {
  const prisma = createPrisma();
  const soroban = {
    registerAudit: jest.fn(),
    verifyAudit: jest.fn(),
  } as unknown as jest.Mocked<SorobanClient>;
  const config = new ConfigService({ VERIDION_VERSION: '2.0.0' });
  let service: BlockchainService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new BlockchainService(prisma as never, soroban, config);
    prisma.db.audit.update.mockResolvedValue({});
    prisma.db.audit.findUnique.mockResolvedValue({
      id: 'audit-id',
      project: { id: 'project-id', name: 'Example', userId: 'user-id' },
      metadata: { contractHash: 'contract-hash' },
      commitHash: 'commit-hash',
      reportHash: 'report-hash',
      securityScore: 88,
    });
    soroban.registerAudit.mockResolvedValue({
      transactionHash: 'register-hash',
      status: 'SUCCESS',
    });
    soroban.verifyAudit.mockResolvedValue({ transactionHash: 'verify-hash', status: 'SUCCESS' });
  });

  it('registers and verifies an owned audit before marking it verified', async () => {
    await expect(
      service.verify('user-id', { auditId: 'audit-id', walletAddress: 'Gwallet' }),
    ).resolves.toEqual({
      transactionHash: 'verify-hash',
      registrationTransactionHash: 'register-hash',
      status: 'SUCCESS',
      auditId: 'audit-id',
    });

    expect(soroban.registerAudit).toHaveBeenCalledWith({
      auditor: 'Gwallet',
      auditId: 'audit-id',
      projectId: 'project-id',
      projectName: 'Example',
      contractHash: 'contract-hash',
      reportHash: 'report-hash',
      securityScore: 88,
      version: '2.0.0',
    });
    expect(soroban.verifyAudit).toHaveBeenCalledWith({
      auditor: 'Gwallet',
      auditId: 'audit-id',
      reportHash: 'report-hash',
    });
    expect(prisma.db.audit.update).toHaveBeenCalledWith({
      where: { id: 'audit-id' },
      data: {
        transactionHash: 'verify-hash',
        chainStatus: 'SUCCESS',
        status: 'VERIFIED',
        reportHash: 'report-hash',
      },
    });
  });

  it('records a failed chain status and returns a service error when Soroban fails', async () => {
    soroban.registerAudit.mockRejectedValue(new Error('RPC unavailable'));

    await expect(
      service.verify('user-id', { auditId: 'audit-id', walletAddress: 'Gwallet' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(prisma.db.audit.update).toHaveBeenCalledWith({
      where: { id: 'audit-id' },
      data: { chainStatus: 'FAILED', error: 'RPC unavailable' },
    });
  });

  it('rejects audits owned by another user', async () => {
    await expect(
      service.verify('another-user', { auditId: 'audit-id', walletAddress: 'Gwallet' }),
    ).rejects.toThrow('Access denied');
    expect(soroban.registerAudit).not.toHaveBeenCalled();
  });
});
