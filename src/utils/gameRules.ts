import { 
  GameState, 
  PlayerSlot, 
  Token, 
  PlayerColor, 
  MoveRecord 
} from '../types/ludo';
import { 
  getGlobalTrackIndex, 
  isSafeSquare 
} from './boardCoordinates';

/**
 * Returns the indices of tokens that can make a legal move with the rolled dice value.
 */
export function getValidMoves(tokens: Token[], diceValue: number): number[] {
  const valid: number[] = [];

  tokens.forEach((token, index) => {
    // In Yard: Requires 6 to enter the board
    if (token.step === -1) {
      if (diceValue === 6) {
        valid.push(index);
      }
      return;
    }

    // Already in Home Goal
    if (token.step === 56) {
      return;
    }

    // On track or in home stretch
    if (token.step + diceValue <= 56) {
      valid.push(index);
    }
  });

  return valid;
}

export interface MoveResult {
  updatedGameState: GameState;
  captured: boolean;
  reachedHome: boolean;
  bonusTurn: boolean;
  description: string;
}

/**
 * Applies a move for a given player and token, handling capturing, bonus rolls, turn alternation, and victory.
 */
export function applyTokenMove(
  currentState: GameState,
  movingSlot: PlayerSlot,
  tokenIndex: number,
  diceValue: number
): MoveResult {
  const isP1 = movingSlot === 'player1';
  const opponentSlot: PlayerSlot = isP1 ? 'player2' : 'player1';
  
  const movingPlayer = currentState[movingSlot]!;
  const opponentPlayer = currentState[opponentSlot];
  
  const movingTokens = [...currentState.tokens[movingSlot]];
  const opponentTokens = opponentPlayer ? [...currentState.tokens[opponentSlot]] : [];

  const tokenToMove = movingTokens[tokenIndex];
  const oldStep = tokenToMove.step;
  let newStep = oldStep;

  if (oldStep === -1) {
    if (diceValue === 6) {
      newStep = 0;
    } else {
      // Cannot move from yard without 6
      return {
        updatedGameState: currentState,
        captured: false,
        reachedHome: false,
        bonusTurn: false,
        description: 'Cannot move from base without a 6',
      };
    }
  } else {
    newStep = oldStep + diceValue;
  }

  // Update moving token
  movingTokens[tokenIndex] = {
    ...tokenToMove,
    step: newStep,
  };

  let captured = false;
  let capturedTokenDesc = '';

  // Check capture if token landed on the main track (step 0..50)
  if (newStep >= 0 && newStep <= 50 && opponentPlayer) {
    const landingGlobal = getGlobalTrackIndex(movingPlayer.color, newStep);
    
    // Captures only occur on non-safe cells
    if (landingGlobal !== null && !isSafeSquare(landingGlobal)) {
      for (let i = 0; i < opponentTokens.length; i++) {
        const oppToken = opponentTokens[i];
        if (oppToken.step >= 0 && oppToken.step <= 50) {
          const oppGlobal = getGlobalTrackIndex(opponentPlayer.color, oppToken.step);
          if (oppGlobal === landingGlobal) {
            // Captured! Send back to yard
            opponentTokens[i] = {
              ...oppToken,
              step: -1,
            };
            captured = true;
            capturedTokenDesc = ` and captured ${opponentPlayer.name}'s token!`;
            break;
          }
        }
      }
    }
  }

  const reachedHome = newStep === 56;

  // Bonus turn conditions:
  // 1. Rolled a 6 (provided not exceeding max consecutive sixes)
  // 2. Captured an opponent token
  // 3. Reached home goal
  const rolledSix = diceValue === 6;
  const consecutiveSixes = rolledSix ? (currentState.consecutiveSixes || 0) + 1 : 0;
  
  // If player rolls 3 consecutive sixes, the 3rd turn bonus is cancelled and turn passes
  const threeSixesPenalty = consecutiveSixes >= 3;

  const bonusTurn = !threeSixesPenalty && (rolledSix || captured || reachedHome);

  // Determine next turn
  let nextTurn: PlayerSlot = movingSlot;
  if (!bonusTurn) {
    nextTurn = opponentSlot;
  }

  // Check victory condition
  const targetHome = currentState.targetTokensHome || 4;
  const finishedCount = movingTokens.filter((t) => t.step === 56).length;
  const isWinner = finishedCount >= targetHome;

  let description = `${movingPlayer.name} `;
  if (oldStep === -1) {
    description += `launched token #${tokenIndex + 1} onto the track`;
  } else if (reachedHome) {
    description += `reached the HOME GOAL with token #${tokenIndex + 1}! 🎉`;
  } else {
    description += `moved token #${tokenIndex + 1} forward ${diceValue} steps`;
  }
  if (captured) {
    description += capturedTokenDesc;
  }
  if (bonusTurn && !isWinner) {
    description += ' (Bonus turn!)';
  } else if (threeSixesPenalty) {
    description += ' (3rd consecutive 6 - turn passed!)';
  }

  const moveRecord: MoveRecord = {
    player: movingSlot,
    tokenId: tokenIndex,
    fromStep: oldStep,
    toStep: newStep,
    captured,
    description,
    timestamp: Date.now(),
  };

  const updatedState: GameState = {
    ...currentState,
    status: isWinner ? 'completed' : currentState.status,
    winner: isWinner ? movingSlot : null,
    tokens: {
      player1: isP1 ? movingTokens : opponentTokens,
      player2: isP1 ? opponentTokens : movingTokens,
    },
    currentTurn: isWinner ? movingSlot : nextTurn,
    diceValue: null,
    diceRolled: false,
    consecutiveSixes: threeSixesPenalty ? 0 : consecutiveSixes,
    validMoves: [],
    lastMove: moveRecord,
    turnDeadline: Date.now() + 30000, // 30 seconds for next turn
    updatedAt: Date.now(),
  };

  return {
    updatedGameState: updatedState,
    captured,
    reachedHome,
    bonusTurn,
    description,
  };
}

/**
 * Heuristic bot choice for single-player / practice match
 */
export function chooseBotMove(
  tokens: Token[],
  validMoves: number[],
  botColor: PlayerColor,
  opponentColor: PlayerColor,
  opponentTokens: Token[],
  diceValue: number
): number {
  if (validMoves.length === 0) return -1;
  if (validMoves.length === 1) return validMoves[0];

  // 1. Can we capture an opponent?
  for (const idx of validMoves) {
    const token = tokens[idx];
    const targetStep = token.step === -1 ? 0 : token.step + diceValue;
    if (targetStep <= 50) {
      const targetGlobal = getGlobalTrackIndex(botColor, targetStep);
      if (targetGlobal !== null && !isSafeSquare(targetGlobal)) {
        for (const opp of opponentTokens) {
          if (opp.step >= 0 && opp.step <= 50) {
            const oppGlobal = getGlobalTrackIndex(opponentColor, opp.step);
            if (oppGlobal === targetGlobal) {
              return idx; // Best move!
            }
          }
        }
      }
    }
  }

  // 2. Can we enter Home Goal (step 56)?
  for (const idx of validMoves) {
    const token = tokens[idx];
    if (token.step + diceValue === 56) {
      return idx;
    }
  }

  // 3. Move token out of yard on a 6
  if (diceValue === 6) {
    const yardToken = validMoves.find((idx) => tokens[idx].step === -1);
    if (yardToken !== undefined) {
      return yardToken;
    }
  }

  // 4. Move token into safe star/start cell
  for (const idx of validMoves) {
    const token = tokens[idx];
    const targetStep = token.step === -1 ? 0 : token.step + diceValue;
    const targetGlobal = getGlobalTrackIndex(botColor, targetStep);
    if (isSafeSquare(targetGlobal)) {
      return idx;
    }
  }

  // 5. Default: Advance the most advanced token that isn't yet in home
  let bestIdx = validMoves[0];
  let maxStep = -2;
  for (const idx of validMoves) {
    if (tokens[idx].step > maxStep) {
      maxStep = tokens[idx].step;
      bestIdx = idx;
    }
  }
  return bestIdx;
}
