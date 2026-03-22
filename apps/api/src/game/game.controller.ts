import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GameService } from './game.service';

@Controller()
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Get('games')
  async getGames() {
    return this.gameService.getGames();
  }

  @Get('rooms')
  async getRooms(@Query('game') gameCode?: string) {
    return this.gameService.getRooms(gameCode);
  }

  @Get('rooms/:id')
  async getRoomDetail(@Param('id') id: string) {
    return this.gameService.getRoomDetail(id);
  }
}
