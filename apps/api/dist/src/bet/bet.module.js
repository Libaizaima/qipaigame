"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BetModule = void 0;
const common_1 = require("@nestjs/common");
const bet_controller_1 = require("./bet.controller");
const bet_service_1 = require("./bet.service");
const wallet_module_1 = require("../wallet/wallet.module");
const ws_module_1 = require("../ws/ws.module");
let BetModule = class BetModule {
};
exports.BetModule = BetModule;
exports.BetModule = BetModule = __decorate([
    (0, common_1.Module)({
        imports: [wallet_module_1.WalletModule, (0, common_1.forwardRef)(() => ws_module_1.WsModule)],
        controllers: [bet_controller_1.BetController],
        providers: [bet_service_1.BetService],
        exports: [bet_service_1.BetService],
    })
], BetModule);
//# sourceMappingURL=bet.module.js.map