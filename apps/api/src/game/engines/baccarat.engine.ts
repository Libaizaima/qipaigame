import * as crypto from 'crypto';

/**
 * 百家乐规则引擎
 *
 * 使用 8 副牌（标准百家乐）
 * 牌面:  A=1, 2-9=面值, 10/J/Q/K=0
 * 点数:  各牌面值之和 mod 10
 */

// 花色
const SUITS = ['♠', '♥', '♦', '♣'] as const;
// 牌面
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export interface Card {
  suit: string;
  rank: string;
  value: number; // 百家乐点数
}

export interface BaccaratResult {
  playerCards: Card[];
  bankerCards: Card[];
  playerTotal: number;
  bankerTotal: number;
  winner: 'player' | 'banker' | 'tie';
  playerPair: boolean;
  bankerPair: boolean;
}

/**
 * 百家乐可下注类型及对应赔率
 */
export const BACCARAT_BET_TYPES: Record<string, { name: string; odds: number }> = {
  player:      { name: '闲',   odds: 1.0 },
  banker:      { name: '庄',   odds: 0.95 },
  tie:         { name: '和',   odds: 8.0 },
  player_pair: { name: '闲对', odds: 11.0 },
  banker_pair: { name: '庄对', odds: 11.0 },
};

export class BaccaratEngine {
  /**
   * 获取牌面的百家乐点数
   */
  static getCardValue(rank: string): number {
    if (rank === 'A') return 1;
    const num = parseInt(rank, 10);
    if (!isNaN(num) && num >= 2 && num <= 9) return num;
    // 10, J, Q, K
    return 0;
  }

  /**
   * 计算手牌总点数（mod 10）
   */
  static calculateTotal(cards: Card[]): number {
    const sum = cards.reduce((acc, card) => acc + card.value, 0);
    return sum % 10;
  }

  /**
   * 生成一副洗好的牌（8 副混合）
   */
  static generateShoe(): Card[] {
    const shoe: Card[] = [];
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
    // Fisher-Yates 洗牌,使用 crypto 安全随机
    for (let i = shoe.length - 1; i > 0; i--) {
      const randomBytes = crypto.randomBytes(4);
      const j = randomBytes.readUInt32BE(0) % (i + 1);
      [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
    }
    return shoe;
  }

  /**
   * 执行一局百家乐
   */
  static play(): BaccaratResult {
    const shoe = BaccaratEngine.generateShoe();
    let cardIndex = 0;

    const drawCard = (): Card => shoe[cardIndex++];

    // 初始发牌: 闲1, 庄1, 闲2, 庄2
    const playerCards: Card[] = [drawCard(), drawCard()]; // 实际应交替发
    const bankerCards: Card[] = [drawCard(), drawCard()];

    // 修正交替发牌顺序: P1, B1, P2, B2
    // 上面的实现是连续发，我们重新排列
    const p1 = shoe[0], b1 = shoe[1], p2 = shoe[2], b2 = shoe[3];
    playerCards[0] = p1;
    playerCards[1] = p2;
    bankerCards[0] = b1;
    bankerCards[1] = b2;
    cardIndex = 4;

    let playerTotal = BaccaratEngine.calculateTotal(playerCards);
    let bankerTotal = BaccaratEngine.calculateTotal(bankerCards);

    // 天牌检查: 任一方 8/9 点，直接比大小
    const isNatural = playerTotal >= 8 || bankerTotal >= 8;

    if (!isNatural) {
      // 闲家补牌规则
      let playerThirdCard: Card | null = null;
      if (playerTotal <= 5) {
        playerThirdCard = drawCard();
        playerCards.push(playerThirdCard);
        playerTotal = BaccaratEngine.calculateTotal(playerCards);
      }

      // 庄家补牌规则
      if (playerThirdCard === null) {
        // 闲家没有补牌
        if (bankerTotal <= 5) {
          bankerCards.push(drawCard());
          bankerTotal = BaccaratEngine.calculateTotal(bankerCards);
        }
      } else {
        // 闲家补了牌，庄家根据闲家第三张牌决定
        const p3Value = playerThirdCard.value;
        let bankerDraw = false;

        if (bankerTotal <= 2) {
          bankerDraw = true;
        } else if (bankerTotal === 3 && p3Value !== 8) {
          bankerDraw = true;
        } else if (bankerTotal === 4 && p3Value >= 2 && p3Value <= 7) {
          bankerDraw = true;
        } else if (bankerTotal === 5 && p3Value >= 4 && p3Value <= 7) {
          bankerDraw = true;
        } else if (bankerTotal === 6 && p3Value >= 6 && p3Value <= 7) {
          bankerDraw = true;
        }

        if (bankerDraw) {
          bankerCards.push(drawCard());
          bankerTotal = BaccaratEngine.calculateTotal(bankerCards);
        }
      }
    }

    // 判断赢家
    let winner: 'player' | 'banker' | 'tie';
    if (playerTotal > bankerTotal) {
      winner = 'player';
    } else if (bankerTotal > playerTotal) {
      winner = 'banker';
    } else {
      winner = 'tie';
    }

    // 判断对子
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

  /**
   * 判断下注是否中奖
   */
  static isWin(betType: string, result: BaccaratResult): boolean {
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

  /**
   * 获取下注类型的赔率
   */
  static getOdds(betType: string): number {
    return BACCARAT_BET_TYPES[betType]?.odds ?? 0;
  }

  /**
   * 计算派奖金额（不含本金）
   * 和局时，庄/闲下注退还本金（返回0表示不输不赢）
   */
  static calculatePayout(betType: string, betAmount: number, result: BaccaratResult): number {
    // 特殊情况：和局时，庄/闲的下注退还本金
    if (result.winner === 'tie' && (betType === 'player' || betType === 'banker')) {
      return betAmount; // 退还本金
    }

    if (BaccaratEngine.isWin(betType, result)) {
      const odds = BaccaratEngine.getOdds(betType);
      return betAmount + betAmount * odds; // 本金 + 赢得金额
    }

    return 0; // 输了，不返还
  }
}
