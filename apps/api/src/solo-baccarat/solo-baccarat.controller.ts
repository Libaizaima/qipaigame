import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SoloBaccaratService } from './solo-baccarat.service';
import { SoloPlayDto } from './dto';
import { CurrentUser } from '../common/decorators';

@Controller('solo/baccarat')
@UseGuards(AuthGuard('jwt'))
export class SoloBaccaratController {
  constructor(private readonly soloBaccaratService: SoloBaccaratService) {}

  @Post('play')
  async play(
    @CurrentUser('userId') userId: string,
    @Body() dto: SoloPlayDto,
  ) {
    return this.soloBaccaratService.play(userId, dto);
  }

  @Get('history')
  async getHistory(
    @CurrentUser('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.soloBaccaratService.getHistory(userId, parseInt(page, 10), parseInt(limit, 10));
  }
}
