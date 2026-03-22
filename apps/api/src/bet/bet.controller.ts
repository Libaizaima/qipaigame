import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { BetService } from './bet.service';
import { PlaceBetDto } from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('bets')
@UseGuards(AuthGuard('jwt'))
export class BetController {
  constructor(private readonly betService: BetService) {}

  @Post()
  async placeBet(
    @CurrentUser('userId') userId: string,
    @Body() dto: PlaceBetDto,
  ) {
    return this.betService.placeBet(userId, dto);
  }

  @Get('my')
  async getMyBets(
    @CurrentUser('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.betService.getMyBets(userId, parseInt(page, 10), parseInt(limit, 10));
  }
}
