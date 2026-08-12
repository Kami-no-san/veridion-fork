import { Body, Controller, Delete, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AiService } from './ai.service';
import { AiChatDto } from './dto/ai.dto';

@ApiTags('AI')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @ApiOperation({ summary: 'Chat with AI about an audit' })
  chat(@Body() dto: AiChatDto, @CurrentUser('id') userId: string) {
    return this.aiService.chat(userId, dto);
  }

  @Delete('conversation/:auditId')
  @ApiOperation({ summary: 'Clear conversation history for an audit' })
  clearConversation(
    @Param('auditId') auditId: string,
    @CurrentUser('id') userId: string,
  ) {
    this.aiService.clearConversation(userId, auditId);
    return { success: true };
  }
}
