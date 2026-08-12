import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { logger } from '@veridion/logger';
import {
  HtmlFormatter,
  JsonFormatter,
  MarkdownFormatter,
  type ReportData,
  ReportGenerator,
} from '@veridion/report-generator';
import { ReportFormat } from '@veridion/shared';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { GenerateReportDto } from './dto/report.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generate(userId: string, dto: GenerateReportDto) {
    const audit = await prismaAuditWithReportData(this.prisma, dto.auditId);
    if (!audit) throw new NotFoundException('Audit not found');
    if (audit.project.userId !== userId) throw new ForbiddenException('Access denied');

    const format = dto.format as ReportFormat;
    const generatedAt = new Date();
    const reportData = {
      auditId: audit.id,
      projectName: audit.project.name,
      contractName: audit.project.contracts[0]?.name ?? audit.project.name,
      contractHash: audit.project.contracts[0]?.hash ?? audit.commitHash ?? audit.id,
      chain: audit.project.chain,
      language: audit.project.language,
      securityScore: audit.securityScore ?? 0,
      findings: audit.findings.map((finding) => ({
        ...finding,
        aiSummary: dto.includeAiSummary ? finding.aiSummary : null,
      })) as unknown as ReportData['findings'],
      generatedAt,
      version: '1.0.0',
    };

    const generator = new ReportGenerator();
    generator.registerFormatter(new JsonFormatter());
    generator.registerFormatter(new MarkdownFormatter());
    generator.registerFormatter(new HtmlFormatter());
    generator.registerFormatter({
      format: ReportFormat.PDF,
      generate: () => 'PDF generation is not available yet. Download the HTML report instead.',
    });

    logger.info({ auditId: dto.auditId, format }, 'Generating report');
    const content = generator.generate(reportData, format);
    const reportHash = `report-${audit.id}`;

    await this.prisma.db.audit.update({
      where: { id: dto.auditId },
      data: { reportHash },
    });

    return {
      auditId: audit.id,
      projectName: audit.project.name,
      format,
      content,
      contentType: this.getContentType(format),
      fileExtension: this.getFileExtension(format),
      reportHash,
      generatedAt: generatedAt.toISOString(),
    };
  }

  async list(userId: string) {
    const audits = await this.prisma.db.audit.findMany({
      where: { project: { userId }, reportHash: { not: null } },
      orderBy: { updatedAt: 'desc' },
      include: {
        project: { select: { name: true } },
        _count: { select: { findings: true } },
      },
    });

    return audits.map((audit) => ({
      id: audit.id,
      auditId: audit.id,
      projectName: audit.project.name,
      auditDate: audit.createdAt,
      securityScore: audit.securityScore,
      findings: audit._count.findings,
      status: audit.status,
      generatedAt: audit.updatedAt,
      reportHash: audit.reportHash,
      formats: [ReportFormat.JSON, ReportFormat.MARKDOWN, ReportFormat.HTML, ReportFormat.PDF],
    }));
  }

  async getReport(auditId: string, userId: string) {
    const audit = await prismaAuditWithReportData(this.prisma, auditId);
    if (!audit) throw new NotFoundException('Audit not found');
    if (audit.project.userId !== userId) throw new ForbiddenException('Access denied');

    return {
      auditId: audit.id,
      projectName: audit.project.name,
      securityScore: audit.securityScore,
      findings: audit.findings,
      reportHash: audit.reportHash,
      generatedAt: audit.completedAt,
    };
  }

  private getContentType(format: ReportFormat): string {
    switch (format) {
      case ReportFormat.HTML:
        return 'text/html';
      case ReportFormat.JSON:
        return 'application/json';
      case ReportFormat.PDF:
        return 'text/plain';
      case ReportFormat.MARKDOWN:
      default:
        return 'text/markdown';
    }
  }

  private getFileExtension(format: ReportFormat): string {
    if (format === ReportFormat.MARKDOWN) return 'md';
    if (format === ReportFormat.PDF) return 'txt';
    return format.toLowerCase();
  }
}

function prismaAuditWithReportData(prisma: PrismaService, auditId: string) {
  return prisma.db.audit.findUnique({
    where: { id: auditId },
    include: {
      project: {
        select: {
          name: true,
          userId: true,
          chain: true,
          language: true,
          contracts: {
            take: 1,
            orderBy: { createdAt: 'asc' },
            select: { name: true, hash: true },
          },
        },
      },
      findings: { orderBy: { severity: 'asc' } },
    },
  });
}
