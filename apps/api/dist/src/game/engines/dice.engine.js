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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiceEngine = exports.DICE_BET_TYPES = void 0;
const crypto = __importStar(require("crypto"));
exports.DICE_BET_TYPES = {
    big: { name: '大', odds: 1.0 },
    small: { name: '小', odds: 1.0 },
    odd: { name: '单', odds: 1.0 },
    even: { name: '双', odds: 1.0 },
    total_4: { name: '总和4', odds: 60.0 },
    total_5: { name: '总和5', odds: 30.0 },
    total_6: { name: '总和6', odds: 17.0 },
    total_7: { name: '总和7', odds: 12.0 },
    total_8: { name: '总和8', odds: 8.0 },
    total_9: { name: '总和9', odds: 6.0 },
    total_10: { name: '总和10', odds: 6.0 },
    total_11: { name: '总和11', odds: 6.0 },
    total_12: { name: '总和12', odds: 6.0 },
    total_13: { name: '总和13', odds: 8.0 },
    total_14: { name: '总和14', odds: 12.0 },
    total_15: { name: '总和15', odds: 17.0 },
    total_16: { name: '总和16', odds: 30.0 },
    total_17: { name: '总和17', odds: 60.0 },
};
class DiceEngine {
    static rollDie() {
        const randomBytes = crypto.randomBytes(4);
        return (randomBytes.readUInt32BE(0) % 6) + 1;
    }
    static play() {
        const dice = [
            DiceEngine.rollDie(),
            DiceEngine.rollDie(),
            DiceEngine.rollDie(),
        ];
        const total = dice[0] + dice[1] + dice[2];
        const isTriple = dice[0] === dice[1] && dice[1] === dice[2];
        return {
            dice,
            total,
            isBig: !isTriple && total >= 11 && total <= 17,
            isSmall: !isTriple && total >= 4 && total <= 10,
            isOdd: total % 2 === 1,
            isEven: total % 2 === 0,
            isTriple,
        };
    }
    static isWin(betType, result) {
        switch (betType) {
            case 'big':
                return result.isBig;
            case 'small':
                return result.isSmall;
            case 'odd':
                return result.isOdd && !result.isTriple;
            case 'even':
                return result.isEven && !result.isTriple;
            default:
                if (betType.startsWith('total_')) {
                    const targetTotal = parseInt(betType.replace('total_', ''), 10);
                    return result.total === targetTotal;
                }
                return false;
        }
    }
    static getOdds(betType) {
        return exports.DICE_BET_TYPES[betType]?.odds ?? 0;
    }
    static calculatePayout(betType, betAmount, result) {
        if (DiceEngine.isWin(betType, result)) {
            const odds = DiceEngine.getOdds(betType);
            return betAmount + betAmount * odds;
        }
        return 0;
    }
}
exports.DiceEngine = DiceEngine;
//# sourceMappingURL=dice.engine.js.map