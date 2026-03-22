import * as crypto from 'crypto';

/**
 * 骰子游戏引擎
 *
 * 使用 3 个骰子（标准骰宝/Sic Bo）
 * 点数范围: 3-18
 * 玩法: 大/小, 单/双, 指定总和点数
 */

export interface DiceResult {
  dice: [number, number, number];
  total: number;
  isBig: boolean;     // 大: 11-17 (三同除外)
  isSmall: boolean;   // 小: 4-10 (三同除外)
  isOdd: boolean;     // 单: 总和为奇数
  isEven: boolean;    // 双: 总和为偶数
  isTriple: boolean;  // 三同（围骰）
}

/**
 * 骰子可下注类型及对应赔率
 */
export const DICE_BET_TYPES: Record<string, { name: string; odds: number }> = {
  big:   { name: '大', odds: 1.0 },
  small: { name: '小', odds: 1.0 },
  odd:   { name: '单', odds: 1.0 },
  even:  { name: '双', odds: 1.0 },
  // 指定点数赔率（根据概率计算）
  total_4:  { name: '总和4',  odds: 60.0 },
  total_5:  { name: '总和5',  odds: 30.0 },
  total_6:  { name: '总和6',  odds: 17.0 },
  total_7:  { name: '总和7',  odds: 12.0 },
  total_8:  { name: '总和8',  odds: 8.0 },
  total_9:  { name: '总和9',  odds: 6.0 },
  total_10: { name: '总和10', odds: 6.0 },
  total_11: { name: '总和11', odds: 6.0 },
  total_12: { name: '总和12', odds: 6.0 },
  total_13: { name: '总和13', odds: 8.0 },
  total_14: { name: '总和14', odds: 12.0 },
  total_15: { name: '总和15', odds: 17.0 },
  total_16: { name: '总和16', odds: 30.0 },
  total_17: { name: '总和17', odds: 60.0 },
};

export class DiceEngine {
  /**
   * 生成一个 1-6 的安全随机骰子
   */
  static rollDie(): number {
    const randomBytes = crypto.randomBytes(4);
    return (randomBytes.readUInt32BE(0) % 6) + 1;
  }

  /**
   * 执行一局骰子（摇3个骰子）
   */
  static play(): DiceResult {
    const dice: [number, number, number] = [
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

  /**
   * 判断下注是否中奖
   */
  static isWin(betType: string, result: DiceResult): boolean {
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
        // 指定点数: total_4, total_5, ...
        if (betType.startsWith('total_')) {
          const targetTotal = parseInt(betType.replace('total_', ''), 10);
          return result.total === targetTotal;
        }
        return false;
    }
  }

  /**
   * 获取下注类型的赔率
   */
  static getOdds(betType: string): number {
    return DICE_BET_TYPES[betType]?.odds ?? 0;
  }

  /**
   * 计算派奖金额
   */
  static calculatePayout(betType: string, betAmount: number, result: DiceResult): number {
    if (DiceEngine.isWin(betType, result)) {
      const odds = DiceEngine.getOdds(betType);
      return betAmount + betAmount * odds; // 本金 + 赢得金额
    }
    return 0; // 输了
  }
}
