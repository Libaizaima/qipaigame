import { Controller, Get, Query } from '@nestjs/common';
import { HistoryService } from './history.service';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get('rounds')
  async getRoundHistory(
    @Query('game') game?: string,
    @Query('roomId') roomId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.historyService.getRoundHistory(
      game,
      roomId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('baccarat')
  async getBaccaratHistory(
    @Query('roomId') roomId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.historyService.getBaccaratHistory(
      roomId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }

  @Get('dice')
  async getDiceHistory(
    @Query('roomId') roomId?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.historyService.getDiceHistory(
      roomId,
      parseInt(page, 10),
      parseInt(limit, 10),
    );
  }
}
