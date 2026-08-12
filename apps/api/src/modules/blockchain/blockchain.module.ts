import { Module } from '@nestjs/common';

import { BlockchainController } from './blockchain.controller';
import { BlockchainService } from './blockchain.service';
import { SorobanClient } from './soroban-client';

@Module({
  controllers: [BlockchainController],
  providers: [BlockchainService, SorobanClient],
  exports: [BlockchainService],
})
export class BlockchainModule {}
