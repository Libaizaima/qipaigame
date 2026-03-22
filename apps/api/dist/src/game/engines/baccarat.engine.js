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
exports.BaccaratEngine = exports.BACCARAT_BET_TYPES = void 0;
const crypto = __importStar(require("crypto"));
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
exports.BACCARAT_BET_TYPES = {
    player: { name: '闲', odds: 1.0 },
    banker: { name: '庄', odds: 0.95 },
    tie: { name: '和', odds: 8.0 },
    player_pair: { name: '闲对', odds: 11.0 },
    banker_pair: { name: '庄对', odds: 11.0 },
};
class BaccaratEngine {
    static getCardValue(rank) {
        if (rank === 'A')
            return 1;
        const num = parseInt(rank, 10);
        if (!isNaN(num) && num >= 2 && num <= 9)
            return num;
        return 0;
    }
    static calculateTotal(cards) {
        const sum = cards.reduce((acc, card) => acc + card.value, 0);
        return sum % 10;
    }
    static generateShoe() {
        const shoe = [];
        for (let deck = 0; deck < 8; deck++) {
            for (const suit of SUITS) {
                for (const rank of RANKS) {
                    shoe.push({
                        suit,
                        rank,
                        value: BaccaratEngine.getCardValue(rank),
                    });
                }
            }
        }
        for (let i = shoe.length - 1; i > 0; i--) {
            const randomBytes = crypto.randomBytes(4);
            const j = randomBytes.readUInt32BE(0) % (i + 1);
            [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
        }
        return shoe;
    }
    static play() {
        const shoe = BaccaratEngine.generateShoe();
        let cardIndex = 0;
        const drawCard = () => shoe[cardIndex++];
        const playerCards = [drawCard(), drawCard()];
        const bankerCards = [drawCard(), drawCard()];
        const p1 = shoe[0], b1 = shoe[1], p2 = shoe[2], b2 = shoe[3];
        playerCards[0] = p1;
        playerCards[1] = p2;
        bankerCards[0] = b1;
        bankerCards[1] = b2;
        cardIndex = 4;
        let playerTotal = BaccaratEngine.calculateTotal(playerCards);
        let bankerTotal = BaccaratEngine.calculateTotal(bankerCards);
        const isNatural = playerTotal >= 8 || bankerTotal >= 8;
        if (!isNatural) {
            let playerThirdCard = null;
            if (playerTotal <= 5) {
                playerThirdCard = drawCard();
                playerCards.push(playerThirdCard);
                playerTotal = BaccaratEngine.calculateTotal(playerCards);
            }
            if (playerThirdCard === null) {
                if (bankerTotal <= 5) {
                    bankerCards.push(drawCard());
                    bankerTotal = BaccaratEngine.calculateTotal(bankerCards);
                }
            }
            else {
                const p3Value = playerThirdCard.value;
                let bankerDraw = false;
                if (bankerTotal <= 2) {
                    bankerDraw = true;
                }
                else if (bankerTotal === 3 && p3Value !== 8) {
                    bankerDraw = true;
                }
                else if (bankerTotal === 4 && p3Value >= 2 && p3Value <= 7) {
                    bankerDraw = true;
                }
                else if (bankerTotal === 5 && p3Value >= 4 && p3Value <= 7) {
                    bankerDraw = true;
                }
                else if (bankerTotal === 6 && p3Value >= 6 && p3Value <= 7) {
                    bankerDraw = true;
                }
                if (bankerDraw) {
                    bankerCards.push(drawCard());
                    bankerTotal = BaccaratEngine.calculateTotal(bankerCards);
                }
            }
        }
        let winner;
        if (playerTotal > bankerTotal) {
            winner = 'player';
        }
        else if (bankerTotal > playerTotal) {
            winner = 'banker';
        }
        else {
            winner = 'tie';
        }
        const playerPair = playerCards[0].rank === playerCards[1].rank;
        const bankerPair = bankerCards[0].rank === bankerCards[1].rank;
        return {
            playerCards,
            bankerCards,
            playerTotal,
            bankerTotal,
            winner,
            playerPair,
            bankerPair,
        };
    }
    static isWin(betType, result) {
        switch (betType) {
            case 'player':
                return result.winner === 'player';
            case 'banker':
                return result.winner === 'banker';
            case 'tie':
                return result.winner === 'tie';
            case 'player_pair':
                return result.playerPair;
            case 'banker_pair':
                return result.bankerPair;
            default:
                return false;
        }
    }
    static getOdds(betType) {
        return exports.BACCARAT_BET_TYPES[betType]?.odds ?? 0;
    }
    static calculatePayout(betType, betAmount, result) {
        if (result.winner === 'tie' && (betType === 'player' || betType === 'banker')) {
            return betAmount;
        }
        if (BaccaratEngine.isWin(betType, result)) {
            const odds = BaccaratEngine.getOdds(betType);
            return betAmount + betAmount * odds;
        }
        return 0;
    }
}
exports.BaccaratEngine = BaccaratEngine;
//# sourceMappingURL=baccarat.engine.js.map