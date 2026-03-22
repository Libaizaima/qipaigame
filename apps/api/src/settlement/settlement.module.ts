import { Module, forwardRef } from '@nestjs/common';
import { SettlementService } from './settlement.service';
import { WalletModule } from '../wallet/wallet.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [WalletModule, forwardRef(() => WsModule)],
  providers: [SettlementService],
  exports: [SettlementService],
})
export class SettlementModule {}
