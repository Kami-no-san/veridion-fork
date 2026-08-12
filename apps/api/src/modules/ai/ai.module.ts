import { Module } from '@nestjs/common';
import {
  AiService as AiEngineService,
  AnthropicProvider,
  OpenAiProvider,
} from '@veridion/ai-engine';
import { logger } from '@veridion/logger';

import { AiController } from './ai.controller';
import { AiService } from './ai.service';

const aiEngineFactory = {
  provide: AiEngineService,
  useFactory: () => {
    const provider = (process.env.AI_PROVIDER ?? 'openai').toLowerCase();
    const openAiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.AI_MODEL;

    if (provider === 'anthropic') {
      if (!anthropicKey) {
        logger.warn('ANTHROPIC_API_KEY not set — AI chat will fail');
      }
      return new AiEngineService(new AnthropicProvider(anthropicKey ?? '', model));
    }

    if (!openAiKey) {
      logger.warn('OPENAI_API_KEY not set — AI chat will fail');
    }
    return new AiEngineService(new OpenAiProvider(openAiKey ?? '', model));
  },
};

@Module({
  controllers: [AiController],
  providers: [AiService, aiEngineFactory],
  exports: [AiService],
})
export class AiModule {}
