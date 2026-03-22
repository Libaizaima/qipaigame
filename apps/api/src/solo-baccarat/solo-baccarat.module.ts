import { Module } from '@nestjs/common';
import { SoloBaccaratController } from './solo-baccarat.controller';
import { SoloBaccaratService } from './solo-baccarat.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  controllers: [SoloBaccaratController],
  providers: [SoloBaccaratService],
})
export class SoloBaccaratModule {}
