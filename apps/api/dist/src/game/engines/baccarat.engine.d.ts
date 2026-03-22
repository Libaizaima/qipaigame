export interface Card {
    suit: string;
    rank: string;
    value: number;
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
export declare const BACCARAT_BET_TYPES: Record<string, {
    name: string;
    odds: number;
}>;
export declare class BaccaratEngine {
    static getCardValue(rank: string): number;
    static calculateTotal(cards: Card[]): number;
    static generateShoe(): Card[];
    static play(): BaccaratResult;
    static isWin(betType: string, result: BaccaratResult): boolean;
    static getOdds(betType: string): number;
    static calculatePayout(betType: string, betAmount: number, result: BaccaratResult): number;
}
