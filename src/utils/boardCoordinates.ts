import { PlayerColor } from '../types/ludo';

export interface GridCoord {
  r: number; // row 0..14
  c: number; // col 0..14
}

// 52 track squares on the 15x15 Ludo board (clockwise loop)
export const MAIN_TRACK: GridCoord[] = [
  { r: 6, c: 1 },  // 0: Red Start (Safe)
  { r: 6, c: 2 },  // 1
  { r: 6, c: 3 },  // 2
  { r: 6, c: 4 },  // 3
  { r: 6, c: 5 },  // 4
  { r: 5, c: 6 },  // 5
  { r: 4, c: 6 },  // 6
  { r: 3, c: 6 },  // 7
  { r: 2, c: 6 },  // 8: Star Safe
  { r: 1, c: 6 },  // 9
  { r: 0, c: 6 },  // 10
  { r: 0, c: 7 },  // 11
  { r: 0, c: 8 },  // 12
  { r: 1, c: 8 },  // 13: Green Start (Safe)
  { r: 2, c: 8 },  // 14
  { r: 3, c: 8 },  // 15
  { r: 4, c: 8 },  // 16
  { r: 5, c: 8 },  // 17
  { r: 6, c: 9 },  // 18
  { r: 6, c: 10 }, // 19
  { r: 6, c: 11 }, // 20
  { r: 6, c: 12 }, // 21: Star Safe
  { r: 6, c: 13 }, // 22
  { r: 6, c: 14 }, // 23
  { r: 7, c: 14 }, // 24
  { r: 8, c: 14 }, // 25
  { r: 8, c: 13 }, // 26: Yellow Start (Safe)
  { r: 8, c: 12 }, // 27
  { r: 8, c: 11 }, // 28
  { r: 8, c: 10 }, // 29
  { r: 8, c: 9 },  // 30
  { r: 9, c: 8 },  // 31
  { r: 10, c: 8 }, // 32
  { r: 11, c: 8 }, // 33
  { r: 12, c: 8 }, // 34: Star Safe
  { r: 13, c: 8 }, // 35
  { r: 14, c: 8 }, // 36
  { r: 14, c: 7 }, // 37
  { r: 14, c: 6 }, // 38
  { r: 13, c: 6 }, // 39: Blue Start (Safe)
  { r: 12, c: 6 }, // 40
  { r: 11, c: 6 }, // 41
  { r: 10, c: 6 }, // 42
  { r: 9, c: 6 },  // 43
  { r: 8, c: 5 },  // 44
  { r: 8, c: 4 },  // 45
  { r: 8, c: 3 },  // 46
  { r: 8, c: 2 },  // 47: Star Safe
  { r: 8, c: 1 },  // 48
  { r: 8, c: 0 },  // 49
  { r: 7, c: 0 },  // 50
  { r: 6, c: 0 },  // 51
];

// Safe track indexes where no capture can occur
export const SAFE_TRACK_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);

// Color start offsets on MAIN_TRACK
export const COLOR_START_OFFSETS: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// Private Home Stretches (steps 51 to 55) leading to center goal
export const HOME_STRETCHES: Record<PlayerColor, GridCoord[]> = {
  red: [
    { r: 7, c: 1 },
    { r: 7, c: 2 },
    { r: 7, c: 3 },
    { r: 7, c: 4 },
    { r: 7, c: 5 },
  ],
  green: [
    { r: 1, c: 7 },
    { r: 2, c: 7 },
    { r: 3, c: 7 },
    { r: 4, c: 7 },
    { r: 5, c: 7 },
  ],
  yellow: [
    { r: 7, c: 13 },
    { r: 7, c: 12 },
    { r: 7, c: 11 },
    { r: 7, c: 10 },
    { r: 7, c: 9 },
  ],
  blue: [
    { r: 13, c: 7 },
    { r: 12, c: 7 },
    { r: 11, c: 7 },
    { r: 10, c: 7 },
    { r: 9, c: 7 },
  ],
};

// Home Goal Center coordinates (step 56)
export const HOME_GOALS: Record<PlayerColor, GridCoord> = {
  red: { r: 7, c: 6 },
  green: { r: 6, c: 7 },
  yellow: { r: 7, c: 8 },
  blue: { r: 8, c: 7 },
};

// Yard Base coordinates for 4 tokens per color (step = -1)
export const YARD_SLOTS: Record<PlayerColor, GridCoord[]> = {
  red: [
    { r: 1.5, c: 1.5 },
    { r: 1.5, c: 3.5 },
    { r: 3.5, c: 1.5 },
    { r: 3.5, c: 3.5 },
  ],
  green: [
    { r: 1.5, c: 10.5 },
    { r: 1.5, c: 12.5 },
    { r: 3.5, c: 10.5 },
    { r: 3.5, c: 12.5 },
  ],
  yellow: [
    { r: 10.5, c: 10.5 },
    { r: 10.5, c: 12.5 },
    { r: 12.5, c: 10.5 },
    { r: 12.5, c: 12.5 },
  ],
  blue: [
    { r: 10.5, c: 1.5 },
    { r: 10.5, c: 3.5 },
    { r: 12.5, c: 1.5 },
    { r: 12.5, c: 3.5 },
  ],
};

/**
 * Returns (xPercent, yPercent) for positioning on a 15x15 board (0..100%)
 */
export function getCoordinatesForStep(
  color: PlayerColor,
  step: number,
  tokenId: number
): { x: number; y: number } {
  // Step -1: In Yard base
  if (step === -1) {
    const slot = YARD_SLOTS[color][tokenId] || YARD_SLOTS[color][0];
    return {
      x: ((slot.c + 0.5) / 15) * 100,
      y: ((slot.r + 0.5) / 15) * 100,
    };
  }

  // Step 0..50: Main common track
  if (step >= 0 && step <= 50) {
    const offset = COLOR_START_OFFSETS[color];
    const trackIndex = (offset + step) % 52;
    const cell = MAIN_TRACK[trackIndex];
    return {
      x: ((cell.c + 0.5) / 15) * 100,
      y: ((cell.r + 0.5) / 15) * 100,
    };
  }

  // Step 51..55: Home stretch
  if (step >= 51 && step <= 55) {
    const stretchIndex = step - 51;
    const cell = HOME_STRETCHES[color][stretchIndex];
    return {
      x: ((cell.c + 0.5) / 15) * 100,
      y: ((cell.r + 0.5) / 15) * 100,
    };
  }

  // Step 56: Home goal
  const goal = HOME_GOALS[color];
  // Slightly fan out completed tokens inside the center triangle
  const offsets = [
    { dx: -0.15, dy: -0.15 },
    { dx: 0.15, dy: -0.15 },
    { dx: -0.15, dy: 0.15 },
    { dx: 0.15, dy: 0.15 },
  ];
  const off = offsets[tokenId % 4];
  return {
    x: ((goal.c + 0.5 + off.dx) / 15) * 100,
    y: ((goal.r + 0.5 + off.dy) / 15) * 100,
  };
}

/**
 * Returns the global track index for a token if it is on the main track, or null if in yard/home stretch.
 */
export function getGlobalTrackIndex(color: PlayerColor, step: number): number | null {
  if (step < 0 || step > 50) return null;
  const offset = COLOR_START_OFFSETS[color];
  return (offset + step) % 52;
}

export function isSafeSquare(globalTrackIndex: number | null): boolean {
  if (globalTrackIndex === null) return false;
  return SAFE_TRACK_INDICES.has(globalTrackIndex);
}
