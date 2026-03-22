export interface DiceResult {
    dice: [number, number, number];
    total: number;
    isBig: boolean;
    isSmall: boolean;
    isOdd: boolean;
    isEven: boolean;
    isTriple: boolean;
}
export declare const DICE_BET_TYPES: Record<string, {
    name: string;
    odds: number;
}>;
export declare class DiceEngine {
    static rollDie(): number;
    static play(): DiceResult;
    static isWin(betType: string, result: DiceResult): boolean;
    static getOdds(betType: string): number;
    static calculatePayout(betType: string, betAmount: number, result: DiceResult): number;
}
