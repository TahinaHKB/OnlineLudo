export interface ShipDefinition {
  id: string;
  name: string;
  size: number;
  icon: string;
}

export const FLEET_CONFIG: ShipDefinition[] = [
  { id: 'patrol', name: 'Torpilleur', size: 2, icon: '🚤' },
  { id: 'submarine', name: 'Sous-marin', size: 3, icon: '🤿' },
  { id: 'destroyer', name: 'Contre-torpilleur', size: 3, icon: '🚢' },
  { id: 'cruiser', name: 'Croiseur', size: 4, icon: '🛳️' },
  { id: 'carrier', name: 'Porte-avions', size: 5, icon: '⚓' },
];

export const GRID_COLS = 7;
export const GRID_ROWS = 9;

export interface Coord {
  r: number; // 0..8 (rows A..I)
  c: number; // 0..6 (cols 1..7)
}

export interface PlacedShip {
  id: string;
  name: string;
  size: number;
  icon: string;
  positions: Coord[];
  isVertical: boolean;
  hits: number;
  sunk: boolean;
}

export interface ShotRecord {
  r: number;
  c: number;
  isHit: boolean;
  shipId?: string;
  sunkShipName?: string;
  timestamp: number;
}

export type BattleshipPhase = 'placement' | 'battle' | 'completed';

export interface BattleshipPlayerState {
  uid: string;
  name: string;
  avatar: string;
  ready: boolean;
  ships: PlacedShip[];
  shotsReceived: ShotRecord[]; // Shots the opponent fired on this player's fleet
}

export interface BattleshipGame {
  id: string;
  roomCode: string;
  mode: 'online' | 'local' | 'bot';
  status: 'waiting' | 'placement' | 'playing' | 'completed' | 'abandoned';
  currentTurn: 'player1' | 'player2';
  player1: BattleshipPlayerState;
  player2: BattleshipPlayerState | null;
  winner: 'player1' | 'player2' | null;
  lastShot: {
    shooter: 'player1' | 'player2';
    r: number;
    c: number;
    isHit: boolean;
    sunkShipName?: string;
    timestamp: number;
  } | null;
  turnDeadline: number;
  createdAt: number;
  updatedAt: number;
}
