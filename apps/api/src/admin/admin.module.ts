import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { GameModule } from '../game/game.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [GameModule, WalletModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
