import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AiService as AiEngineService } from '@veridion/ai-engine';
import type { AiChatMessage } from '@veridion/shared';

import { PrismaService } from '../../common/prisma/prisma.service';
import { AiService } from './ai.service';
import type { AiChatDto } from './dto/ai.dto';

const mockFindings = [
  {
    id: 'finding-1',
    title: 'Reentrancy Vulnerability',
    description: 'A reentrancy vulnerability was found in the withdraw function.',
    severity: 'CRITICAL',
    filePath: 'contracts/LiquidPool.sol',
    lineStart: 42,
    lineEnd: 56,
    codeSnippet: 'function withdraw() external { ... }',
    recommendation: 'Use Checks-Effects-Interactions pattern.',
    pluginId: 'reentrancy',
  },
  {
    id: 'finding-2',
    title: 'Missing Access Control',
    description: 'Admin functions lack access control modifiers.',
    severity: 'HIGH',
    filePath: 'contracts/Admin.sol',
    lineStart: 15,
    lineEnd: 20,
    codeSnippet: 'function setFee(uint256 _fee) external { ... }',
    recommendation: 'Add onlyOwner modifier.',
    pluginId: 'access-control',
  },
];

const mockAudit = {
  id: 'audit-1',
  status: 'COMPLETED',
  securityScore: 75,
  project: { userId: 'user-1' },
  findings: mockFindings,
};

const mockPrisma = {
  db: {
    audit: {
      findUnique: jest.fn(),
    },
  },
};

const createMockAiEngine = () => ({
  chat: jest.fn<Promise<AiChatMessage>, [AiChatMessage[]]>(),
  analyzeContract: jest.fn(),
  explainVulnerability: jest.fn(),
  suggestFix: jest.fn(),
  generateReportSummary: jest.fn(),
  switchProvider: jest.fn(),
});

describe('AiService', () => {
  let service: AiService;
  let mockAiEngine: ReturnType<typeof createMockAiEngine>;

  beforeEach(async () => {
    mockAiEngine = createMockAiEngine();
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: AiEngineService, useValue: mockAiEngine },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  const chatDto: AiChatDto = {
    auditId: 'audit-1',
    message: 'Tell me about the reentrancy finding',
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw NotFoundException when audit does not exist', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(null);

    await expect(service.chat('user-1', chatDto)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when the audit belongs to another user', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(mockAudit);

    await expect(service.chat('user-2', chatDto)).rejects.toThrow(ForbiddenException);
  });

  it('should return AI response with citations', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(mockAudit);
    mockAiEngine.chat.mockResolvedValue({
      role: 'assistant',
      content:
        'The reentrancy vulnerability [Finding: finding-1] is critical. You should also check [Finding: finding-2].',
    });

    const result = await service.chat('user-1', chatDto);

    expect(result.message).toContain('[Finding: finding-1]');
    expect(result.citations).toHaveLength(2);
    expect(result.citations[0]).toEqual({
      findingId: 'finding-1',
      lineStart: 42,
      lineEnd: 56,
    });
  });

  it('should maintain conversation history across calls', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(mockAudit);
    mockAiEngine.chat.mockResolvedValueOnce({
      role: 'assistant',
      content: 'First response [Finding: finding-1]',
    });
    mockAiEngine.chat.mockResolvedValueOnce({
      role: 'assistant',
      content: 'Follow-up response',
    });

    // First message
    await service.chat('user-1', chatDto);

    // Second message — should include history
    await service.chat('user-1', { ...chatDto, message: 'Tell me more' });

    // The second call should include previous messages
    const secondCallMessages = mockAiEngine.chat.mock.calls[1]?.[0] ?? [];
    const userMessages = secondCallMessages.filter((m) => m.role === 'user');
    expect(userMessages).toHaveLength(2);
  });

  it('should include finding context when findingId is provided', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(mockAudit);
    mockAiEngine.chat.mockResolvedValue({
      role: 'assistant',
      content: 'Here is the fix for that finding.',
    });

    await service.chat('user-1', {
      ...chatDto,
      context: { findingId: 'finding-1' },
    });

    const messages = mockAiEngine.chat.mock.calls[0]?.[0] ?? [];
    const userMsg = messages.find((m) => m.role === 'user');
    expect(userMsg?.content).toContain('Reentrancy Vulnerability');
    expect(userMsg?.content).toContain('Reentrancy Vulnerability');
  });

  it('should throw InternalServerErrorException when AI engine fails', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(mockAudit);
    mockAiEngine.chat.mockRejectedValue(new Error('API rate limit exceeded'));

    await expect(service.chat('user-1', chatDto)).rejects.toThrow(InternalServerErrorException);
  });

  it('should clear conversation', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(mockAudit);
    mockAiEngine.chat.mockResolvedValue({
      role: 'assistant',
      content: 'Response',
    });

    await service.chat('user-1', chatDto);
    service.clearConversation('user-1', 'audit-1');

    // Next message should start fresh
    await service.chat('user-1', { ...chatDto, message: 'New question' });

    const messages = mockAiEngine.chat.mock.calls[1]?.[0] ?? [];
    const userMessages = messages.filter((m) => m.role === 'user');
    expect(userMessages).toHaveLength(1);
  });

  it('should handle audit with no findings', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue({
      ...mockAudit,
      findings: [],
    });
    mockAiEngine.chat.mockResolvedValue({
      role: 'assistant',
      content: 'No findings to discuss.',
    });

    const result = await service.chat('user-1', chatDto);
    expect(result.citations).toHaveLength(0);
  });

  it('should match citations by finding title', async () => {
    mockPrisma.db.audit.findUnique.mockResolvedValue(mockAudit);
    mockAiEngine.chat.mockResolvedValue({
      role: 'assistant',
      content: 'The [Finding: Reentrancy Vulnerability] needs immediate attention.',
    });

    const result = await service.chat('user-1', chatDto);

    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toEqual({
      findingId: 'finding-1',
      lineStart: 42,
      lineEnd: 56,
    });
  });
});
