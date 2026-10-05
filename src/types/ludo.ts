export type PlayerColor = 'red' | 'yellow' | 'green' | 'blue';

export type PlayerSlot = 'player1' | 'player2';

export interface Token {
  id: number;
  /**
   * -1: in player's yard base
   * 0..50: on common outer ring (0 is player's entry cell)
   * 51..55: on player's private home stretch
   * 56: in central Home goal
   */
  step: number;
}

export interface PlayerInfo {
  uid: string;
  name: string;
  avatar: string;
  color: PlayerColor;
  connected?: boolean;
}

export interface MoveRecord {
  player: PlayerSlot;
  tokenId: number;
  fromStep: number;
  toStep: number;
  captured: boolean;
  description: string;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  senderUid: string;
  senderName: string;
  senderSlot: PlayerSlot;
  text: string;
  isReaction?: boolean;
  timestamp: number;
}

export interface GameState {
  id: string;
  roomCode: string;
  mode: 'online' | 'local' | 'bot';
  status: 'waiting' | 'playing' | 'completed' | 'abandoned';
  targetTokensHome: number; // default 4
  player1: PlayerInfo;
  player2: PlayerInfo | null;
  currentTurn: PlayerSlot;
  diceValue: number | null;
  diceRolled: boolean;
  consecutiveSixes: number;
  tokens: {
    player1: Token[];
    player2: Token[];
  };
  validMoves: number[]; // indices of tokens [0..3] that can be clicked/moved
  winner: PlayerSlot | null;
  lastMove: MoveRecord | null;
  turnDeadline: number; // unix ms timestamp
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface UserProfile {
  id: string;
  displayName: string;
  email?: string;
  avatar: string;
  isOnline: boolean;
  lastActive: number;
  stats: {
    gamesPlayed: number;
    wins: number;
    losses: number;
    streak: number;
  };
  createdAt: number;
}

export interface GameInvite {
  id: string;
  senderUid: string;
  senderName: string;
  senderAvatar: string;
  recipientUid: string;
  recipientName: string;
  gameId: string;
  roomCode: string;
  gameType?: 'ludo' | 'battleship';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  createdAt: number;
}

export interface MatchHistoryRecord {
  id: string;
  gameId: string;
  gameType?: 'ludo' | 'battleship';
  player1Uid: string;
  player1Name: string;
  player1Color: PlayerColor;
  player2Uid: string;
  player2Name: string;
  player2Color: PlayerColor;
  winnerUid: string;
  winnerName: string;
  winnerSlot: PlayerSlot;
  turnsCount: number;
  durationSeconds: number;
  player1TokensFinished: number;
  player2TokensFinished: number;
  createdAt: number;
}
