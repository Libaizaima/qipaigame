"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../prisma/prisma.service");
const uuid_1 = require("uuid");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    jwtService;
    configService;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, jwtService, configService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
        this.configService = configService;
    }
    async register(dto) {
        const existing = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (existing) {
            throw new common_1.ConflictException('用户名已被注册');
        }
        if (dto.email) {
            const existingEmail = await this.prisma.user.findUnique({
                where: { email: dto.email },
            });
            if (existingEmail) {
                throw new common_1.ConflictException('邮箱已被注册');
            }
        }
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const initialBalance = this.configService.get('INITIAL_BALANCE', 10000);
        const user = await this.prisma.$transaction(async (tx) => {
            const newUser = await tx.user.create({
                data: {
                    username: dto.username,
                    email: dto.email,
                    passwordHash,
                },
            });
            const wallet = await tx.wallet.create({
                data: {
                    userId: newUser.id,
                    balance: initialBalance,
                },
            });
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
    async login(dto, ip, userAgent) {
        const user = await this.prisma.user.findUnique({
            where: { username: dto.username },
        });
        if (!user) {
            throw new common_1.UnauthorizedException('用户名或密码错误');
        }
        if (user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('账号已被禁用');
        }
        const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
        if (!passwordValid) {
            throw new common_1.UnauthorizedException('用户名或密码错误');
        }
        const tokens = await this.generateTokens(user.id, user.username, user.role);
        const refreshDays = this.configService.get('JWT_REFRESH_EXPIRES_DAYS', 7);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + refreshDays);
        await this.prisma.userSession.create({
            data: {
                userId: user.id,
                refreshToken: tokens.refreshToken,
                expiresAt,
            },
        });
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
    async refresh(refreshToken) {
        const session = await this.prisma.userSession.findFirst({
            where: {
                refreshToken,
                expiresAt: { gt: new Date() },
            },
            include: { user: true },
        });
        if (!session) {
            throw new common_1.UnauthorizedException('Refresh token 无效或已过期');
        }
        if (session.user.status !== 'ACTIVE') {
            throw new common_1.UnauthorizedException('账号已被禁用');
        }
        const tokens = await this.generateTokens(session.user.id, session.user.username, session.user.role);
        const refreshDays = this.configService.get('JWT_REFRESH_EXPIRES_DAYS', 7);
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
    async logout(refreshToken) {
        await this.prisma.userSession.deleteMany({
            where: { refreshToken },
        });
        return { message: '已退出登录' };
    }
    async generateTokens(userId, username, role) {
        const payload = { sub: userId, username, role };
        const expiresInSeconds = this.configService.get('JWT_EXPIRES_IN_SECONDS', 900);
        const accessToken = this.jwtService.sign(payload, {
            expiresIn: expiresInSeconds,
        });
        const refreshToken = (0, uuid_1.v4)();
        return { accessToken, refreshToken };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map