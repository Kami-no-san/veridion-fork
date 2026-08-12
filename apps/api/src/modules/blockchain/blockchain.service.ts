import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { logger } from '@veridion/logger';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { VerifyAuditDto } from './dto/blockchain.dto';
import { SorobanClient } from './soroban-client';

@Injectable()
export class BlockchainService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly soroban: SorobanClient,
    private readonly config: ConfigService,
  ) {}

  async verify(userId: string, dto: VerifyAuditDto) {
    const audit = await this.prisma.db.audit.findUnique({
      where: { id: dto.auditId },
      include: { project: { select: { id: true, name: true, userId: true } } },
    });
    if (!audit) throw new NotFoundException('Audit not found');
    if (audit.project.userId !== userId) throw new ForbiddenException('Access denied');

    const metadata =
      audit.metadata && typeof audit.metadata === 'object' && !Array.isArray(audit.metadata)
        ? (audit.metadata as Record<string, unknown>)
        : {};
    const contractHash =
      typeof metadata.contractHash === 'string'
        ? metadata.contractHash
        : (audit.commitHash ?? audit.id);
    const reportHash = audit.reportHash ?? `report-${audit.id}`;

    logger.info(
      { auditId: dto.auditId, walletAddress: dto.walletAddress },
      'Blockchain verification requested',
    );

    try {
      const registration = await this.soroban.registerAudit({
        auditor: dto.walletAddress,
        auditId: audit.id,
        projectId: audit.project.id,
        projectName: audit.project.name,
        contractHash,
        reportHash,
        securityScore: Math.max(0, Math.min(100, audit.securityScore ?? 0)),
        version: this.config.get<string>('VERIDION_VERSION', '1.0.0'),
      });
      const verification = await this.soroban.verifyAudit({
        auditor: dto.walletAddress,
        auditId: audit.id,
        reportHash,
      });

      await this.prisma.db.audit.update({
        where: { id: dto.auditId },
        data: {
          transactionHash: verification.transactionHash,
          chainStatus: verification.status,
          status: 'VERIFIED',
          reportHash,
        },
      });

      return {
        transactionHash: verification.transactionHash,
        registrationTransactionHash: registration.transactionHash,
        status: verification.status,
        auditId: dto.auditId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown Soroban error';
      await this.prisma.db.audit.update({
        where: { id: dto.auditId },
        data: { chainStatus: 'FAILED', error: message },
      });
      logger.error({ auditId: dto.auditId, error }, 'Soroban verification failed');
      throw new ServiceUnavailableException('Unable to verify audit on Stellar');
    }
  }

  async getVerification(auditId: string) {
    const audit = await this.prisma.db.audit.findUnique({
      where: { id: auditId },
      select: {
        id: true,
        transactionHash: true,
        chainStatus: true,
        securityScore: true,
        reportHash: true,
      },
    });

    if (!audit) throw new NotFoundException('Audit not found');

    return {
      auditId: audit.id,
      transactionHash: audit.transactionHash,
      chainStatus: audit.chainStatus,
      securityScore: audit.securityScore,
      reportHash: audit.reportHash,
    };
  }
}
