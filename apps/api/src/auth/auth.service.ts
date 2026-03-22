import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    // 检查用户名是否已存在
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('用户名已被注册');
    }

    // 检查邮箱是否已存在
    if (dto.email) {
      const existingEmail = await this.prisma.user.findUnique({
        where: { email: dto.email },
      });
      if (existingEmail) {
        throw new ConflictException('邮箱已被注册');
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const initialBalance = this.configService.get<number>('INITIAL_BALANCE', 10000);

    // 创建用户和钱包（事务）
    const user = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          username: dto.username,
          email: dto.email,
          passwordHash,
        },
      });

      // 创建钱包并赠送初始筹码
      const wallet = await tx.wallet.create({
        data: {
          userId: newUser.id,
          balance: initialBalance,
        },
      });

      // 记录初始赠送的账变流水
      await tx.walletTransaction.create({
        data: {
          userId: newUser.id,
          walletId: wallet.id,
          type: 'BONUS',
          amount: initialBalance,
          beforeBalance: 0,
          afterBalance: initialBalance,
          referenceType: 'REGISTER_BONUS',
          referenceId: newUser.id,
        },
      });

      return newUser;
    });

    this.logger.log(`User registered: ${user.username}`);
    return { message: '注册成功', userId: user.id };
  }

  async login(dto: LoginDto, ip?: string, userAgent?: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });

    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账号已被禁用');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 生成 token
    const tokens = await this.generateTokens(user.id, user.username, user.role);

    // 存储 refresh token
    const refreshDays = this.configService.get<number>('JWT_REFRESH_EXPIRES_DAYS', 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.userSession.create({
      data: {
        userId: user.id,
        refreshToken: tokens.refreshToken,
        expiresAt,
      },
    });

    // 记录登录日志
    await this.prisma.loginLog.create({
      data: {
        userId: user.id,
        ip,
        userAgent,
      },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    const session = await this.prisma.userSession.findFirst({
      where: {
        refreshToken,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!session) {
      throw new UnauthorizedException('Refresh token 无效或已过期');
    }

    if (session.user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 生成新 token
    const tokens = await this.generateTokens(
      session.user.id,
      session.user.username,
      session.user.role,
    );

    // 删除旧 session，创建新 session
    const refreshDays = this.configService.get<number>('JWT_REFRESH_EXPIRES_DAYS', 7);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + refreshDays);

    await this.prisma.$transaction([
      this.prisma.userSession.delete({ where: { id: session.id } }),
      this.prisma.userSession.create({
        data: {
          userId: session.user.id,
          refreshToken: tokens.refreshToken,
          expiresAt,
        },
      }),
    ]);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(refreshToken: string) {
    await this.prisma.userSession.deleteMany({
      where: { refreshToken },
    });
    return { message: '已退出登录' };
  }

  private async generateTokens(userId: string, username: string, role: string) {
    const payload = { sub: userId, username, role };
    const expiresInSeconds = this.configService.get<number>('JWT_EXPIRES_IN_SECONDS', 900);

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: expiresInSeconds,
    });

    const refreshToken = uuidv4();

    return { accessToken, refreshToken };
  }
}
