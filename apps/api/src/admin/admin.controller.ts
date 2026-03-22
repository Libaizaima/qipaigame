import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators';
import { RolesGuard } from '../common/guards';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  async getUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getUsers(parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('bets')
  async getBets(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getBets(parseInt(page, 10), parseInt(limit, 10));
  }

  @Get('transactions')
  async getTransactions(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.adminService.getTransactions(parseInt(page, 10), parseInt(limit, 10));
  }

  @Post('rooms/:id/pause')
  async pauseRoom(@Param('id') id: string) {
    return this.adminService.pauseRoom(id);
  }

  @Post('rooms/:id/resume')
  async resumeRoom(@Param('id') id: string) {
    return this.adminService.resumeRoom(id);
  }

  @Post('users/:id/ban')
  async banUser(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id, 'BANNED');
  }

  @Post('users/:id/activate')
  async activateUser(@Param('id') id: string) {
    return this.adminService.toggleUserStatus(id, 'ACTIVE');
  }
}
