// src/game/types.ts

export type CardColor = 'red' | 'green' | 'blue' | 'yellow' | 'wild';
export type CardValue = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' |
                        'skip' | 'reverse' | 'draw2' | 'wild' | 'draw4';

export interface Card {
    id: string; // Unique ID for each card
    color: CardColor;
    value: CardValue;
    playedById?: string;
}

// Simple player state to broadcast
export interface PlayerPublicInfo {
    id: string;
    email: string;
    cardCount: number;
    firstName?: string;
    lastName?: string;
}


// Full player state (server-side)
export interface Player extends PlayerPublicInfo {
    socketId: string;
    hand: Card[];
    hasCalledUno: boolean;
}

////// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

// Total game state (sent to clients)
export interface GameState {
    gameId: string;
    players: PlayerPublicInfo[];
    currentPlayerId: string | null;
    topCard: Card | null;
    currentTurnPlayerIndex: number;
    direction: 1 | -1; // 1 is cw, -1 is ccw
    currentColor: CardColor;
    isGameOver: boolean;
    winnerId?: string | null;
    drawPileSize: number;
}