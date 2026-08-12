import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import type { AiChatMessage } from '@veridion/shared';
import { AiService as AiEngineService } from '@veridion/ai-engine';
import { logger } from '@veridion/logger';

import { PrismaService } from '../../common/prisma/prisma.service';
import type { AiChatDto } from './dto/ai.dto';

export interface Citation {
  findingId?: string;
  lineStart?: number;
  lineEnd?: number;
}

export interface ChatResponse {
  message: string;
  citations: Citation[];
}

interface AuditFindingSummary {
  id: string;
  title: string;
  description: string;
  severity: string;
  filePath: string;
  lineStart: number;
  lineEnd: number;
  codeSnippet: string | null;
  recommendation: string | null;
  pluginId: string;
}

interface AuditWithFindings {
  id: string;
  status: string;
  securityScore: number | null;
  findings: AuditFindingSummary[];
}

const MAX_HISTORY_LENGTH = 50;
const CONVERSATION_TTL_MS = 30 * 60 * 1000; // 30 minutes

@Injectable()
export class AiService {
  private readonly conversations = new Map<string, AiChatMessage[]>();
  private readonly conversationTimers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEngine: AiEngineService,
  ) {}

  async chat(userId: string, dto: AiChatDto): Promise<ChatResponse> {
    const audit = await this.prisma.db.audit.findUnique({
      where: { id: dto.auditId },
      include: {
        findings: {
          orderBy: { severity: 'asc' },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException(`Audit with ID ${dto.auditId} not found`);
    }

    const conversationKey = `${userId}:${dto.auditId}`;
    const history = this.getOrCreateHistory(conversationKey);

    // If this is the first message, prepend the system prompt
    const systemMessage: AiChatMessage = {
      role: 'system',
      content: this.buildSystemPrompt(audit),
    };

    // Add the user message with optional context
    let userContent = dto.message;
    if (dto.context?.findingId) {
      const finding = audit.findings.find((f) => f.id === dto.context!.findingId);
      if (finding) {
        userContent = `[Context: User is asking about finding "${finding.title}" (${finding.severity}) in ${finding.filePath}:${finding.lineStart}-${finding.lineEnd}]\n\n${dto.message}`;
      }
    }

    if (dto.context?.codeSnippet) {
      userContent = `[Context: User is asking about this code snippet]\n\`\`\`solidity\n${dto.context.codeSnippet}\n\`\`\`\n\n${userContent}`;
    }

    history.push({ role: 'user', content: userContent });

    // Trim history if too long, keeping system message and recent messages
    const recentHistory = history.length > MAX_HISTORY_LENGTH
      ? history.slice(-MAX_HISTORY_LENGTH)
      : history;

    const messages: AiChatMessage[] = [systemMessage, ...recentHistory];

    logger.info(
      { auditId: dto.auditId, userId, messageCount: messages.length },
      'AI chat request',
    );

    try {
      const response = await this.aiEngine.chat(messages);

      // Store assistant response in history
      history.push(response);
      this.conversations.set(conversationKey, history);
      this.refreshTtl(conversationKey);

      // Parse citations from response
      const citations = this.extractCitations(response.content, audit.findings);

      logger.info(
        { auditId: dto.auditId, citationCount: citations.length },
        'AI chat response received',
      );

      return {
        message: response.content,
        citations,
      };
    } catch (error) {
      logger.error(
        { error, auditId: dto.auditId, userId },
        'AI chat request failed',
      );
      throw new InternalServerErrorException(
        'AI service is temporarily unavailable. Please try again later.',
      );
    }
  }

  clearConversation(userId: string, auditId: string): void {
    const key = `${userId}:${auditId}`;
    this.conversations.delete(key);
    const timer = this.conversationTimers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.conversationTimers.delete(key);
    }
  }

  // ---- Private helpers ----

  private getOrCreateHistory(key: string): AiChatMessage[] {
    const existing = this.conversations.get(key);
    if (existing) {
      this.refreshTtl(key);
      return existing;
    }
    const history: AiChatMessage[] = [];
    this.conversations.set(key, history);
    this.refreshTtl(key);
    return history;
  }

  private refreshTtl(key: string): void {
    const existing = this.conversationTimers.get(key);
    if (existing) {
      clearTimeout(existing);
    }
    this.conversationTimers.set(
      key,
      setTimeout(() => {
        this.conversations.delete(key);
        this.conversationTimers.delete(key);
      }, CONVERSATION_TTL_MS),
    );
  }

  private buildSystemPrompt(audit: AuditWithFindings): string {
    const findingCounts = audit.findings.reduce(
      (acc, f) => {
        acc[f.severity] = (acc[f.severity] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const scoreLine = audit.securityScore !== null
      ? `Security Score: ${audit.securityScore}/100`
      : 'Security Score: Not yet scored';

    let prompt = `You are Veridion, an expert smart contract security assistant. You help developers understand and fix vulnerabilities in their smart contracts.

## Current Audit Context
- Audit ID: ${audit.id}
- Status: ${audit.status}
- ${scoreLine}
- Finding Summary: ${JSON.stringify(findingCounts)}

## Findings in this Audit
`;

    if (audit.findings.length === 0) {
      prompt += 'No findings have been detected yet.';
    } else {
      for (const finding of audit.findings) {
        prompt += `
### ${finding.title} (${finding.severity})
- ID: ${finding.id}
- Location: ${finding.filePath}:${finding.lineStart}-${finding.lineEnd}
- Plugin: ${finding.pluginId}
- Description: ${finding.description}
${finding.recommendation ? `- Recommendation: ${finding.recommendation}` : ''}
${finding.codeSnippet ? `- Code:\n\`\`\`solidity\n${finding.codeSnippet}\n\`\`\`` : ''}
`;
      }
    }

    prompt += `
## Instructions
1. Answer questions about the findings, their severity, impact, and how to fix them.
2. When referencing a finding, cite its ID (e.g., "[Finding: <id>]") so the UI can link to it.
3. Provide concrete, actionable advice with code examples where appropriate.
4. If asked about a specific finding, provide detailed remediation steps.
5. Be concise but thorough. Prioritize critical and high-severity findings.
6. If the user asks something outside the audit context, answer to the best of your ability about smart contract security.`;

    return prompt;
  }

  private extractCitations(
    content: string,
    findings: Array<{
      id: string;
      title: string;
      filePath: string;
      lineStart: number;
      lineEnd: number;
    }>,
  ): Citation[] {
    const citations: Citation[] = [];
    const findingMap = new Map(findings.map((f) => [f.id, f]));

    // Pattern: [Finding: <uuid>] or [Finding: <finding-title>]
    const citationRegex = /\[Finding:\s*([^\]]+)\]/gi;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(content)) !== null) {
      const ref = match[1]!.trim();

      // Try to match by UUID first
      const findingById = findingMap.get(ref);
      if (findingById) {
        if (!citations.some((c) => c.findingId === findingById.id)) {
          citations.push({
            findingId: findingById.id,
            lineStart: findingById.lineStart,
            lineEnd: findingById.lineEnd,
          });
        }
        continue;
      }

      // Try to match by title
      const findingByTitle = findings.find(
        (f) => f.title.toLowerCase() === ref.toLowerCase(),
      );
      if (findingByTitle) {
        if (!citations.some((c) => c.findingId === findingByTitle.id)) {
          citations.push({
            findingId: findingByTitle.id,
            lineStart: findingByTitle.lineStart,
            lineEnd: findingByTitle.lineEnd,
          });
        }
      }
    }

    return citations;
  }
}
