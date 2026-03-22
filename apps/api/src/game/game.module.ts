import { Module, forwardRef } from '@nestjs/common';
import { GameController } from './game.controller';
import { GameService } from './game.service';
import { GameLoopService } from './game-loop.service';
import { SettlementModule } from '../settlement/settlement.module';
import { WsModule } from '../ws/ws.module';

@Module({
  imports: [
    forwardRef(() => SettlementModule),
    forwardRef(() => WsModule),
  ],
  controllers: [GameController],
  providers: [GameService, GameLoopService],
  exports: [GameService, GameLoopService],
})
export class GameModule {}
