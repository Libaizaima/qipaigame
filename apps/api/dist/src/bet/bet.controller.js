"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetController = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const bet_service_1 = require("./bet.service");
const dto_1 = require("./dto");
const decorators_1 = require("../common/decorators");
let BetController = class BetController {
    betService;
    constructor(betService) {
        this.betService = betService;
    }
    async placeBet(userId, dto) {
        return this.betService.placeBet(userId, dto);
    }
    async getMyBets(userId, page = '1', limit = '20') {
        return this.betService.getMyBets(userId, parseInt(page, 10), parseInt(limit, 10));
    }
};
exports.BetController = BetController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, decorators_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.PlaceBetDto]),
    __metadata("design:returntype", Promise)
], BetController.prototype, "placeBet", null);
__decorate([
    (0, common_1.Get)('my'),
    __param(0, (0, decorators_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], BetController.prototype, "getMyBets", null);
exports.BetController = BetController = __decorate([
    (0, common_1.Controller)('bets'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [bet_service_1.BetService])
], BetController);
//# sourceMappingURL=bet.controller.js.map