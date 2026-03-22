import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';

// Infrastructure
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { WsModule } from './ws/ws.module';

// Feature modules
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { WalletModule } from './wallet/wallet.module';
import { GameModule } from './game/game.module';
import { BetModule } from './bet/bet.module';
import { SettlementModule } from './settlement/settlement.module';
import { HistoryModule } from './history/history.module';
import { AdminModule } from './admin/admin.module';
import { SoloBaccaratModule } from './solo-baccarat/solo-baccarat.module';

@Module({
  imports: [
    // 全局配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ScheduleModule.forRoot(),

    // 基础设施
    PrismaModule,
    RedisModule,
    WsModule,

    // 业务模块
    AuthModule,
    UserModule,
    WalletModule,
    GameModule,
    BetModule,
    SettlementModule,
    HistoryModule,
    AdminModule,
    SoloBaccaratModule,
  ],
})
export class AppModule {}
