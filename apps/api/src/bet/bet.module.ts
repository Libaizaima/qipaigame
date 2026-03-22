import { Module, forwardRef } from '@nestjs/common';
import { BetController } from './bet.controller';
import { BetService } from './bet.service';
import { WalletModule } from '../wallet/wallet.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WalletModule, forwardRef(() => WsModule)],
  controllers: [BetController],
  providers: [BetService],
  exports: [BetService],
})
export class BetModule {}
