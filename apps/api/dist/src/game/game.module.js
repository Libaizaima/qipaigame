"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameModule = void 0;
const common_1 = require("@nestjs/common");
const game_controller_1 = require("./game.controller");
const game_service_1 = require("./game.service");
const game_loop_service_1 = require("./game-loop.service");
const settlement_module_1 = require("../settlement/settlement.module");
const ws_module_1 = require("../ws/ws.module");
let GameModule = class GameModule {
};
exports.GameModule = GameModule;
exports.GameModule = GameModule = __decorate([
    (0, common_1.Module)({
        imports: [
            (0, common_1.forwardRef)(() => settlement_module_1.SettlementModule),
            (0, common_1.forwardRef)(() => ws_module_1.WsModule),
        ],
        controllers: [game_controller_1.GameController],
        providers: [game_service_1.GameService, game_loop_service_1.GameLoopService],
        exports: [game_service_1.GameService, game_loop_service_1.GameLoopService],
    })
], GameModule);
//# sourceMappingURL=game.module.js.map