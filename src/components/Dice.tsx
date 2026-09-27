import React from 'react';
import { PlayerColor } from '../types/ludo';
import { sounds } from '../utils/audio';

interface DiceProps {
  value: number | null;
  isRolling: boolean;
  canRoll: boolean;
  color: PlayerColor;
  onRoll: () => void;
  disabled?: boolean;
}

export const Dice: React.FC<DiceProps> = ({
  value,
  isRolling,
  canRoll,
  color,
  onRoll,
  disabled = false,
}) => {
  const handleClick = () => {
    if (!canRoll || disabled || isRolling) return;
    sounds.playRoll();
    onRoll();
  };

  // Color theming for the active dice rim/border
  const colorGradients: Record<PlayerColor, string> = {
    red: 'from-rose-500 to-red-600 shadow-rose-500/40 ring-rose-400',
    yellow: 'from-amber-400 to-yellow-500 shadow-amber-500/40 ring-amber-300',
    green: 'from-emerald-400 to-green-600 shadow-emerald-500/40 ring-emerald-300',
    blue: 'from-sky-400 to-blue-600 shadow-sky-500/40 ring-sky-300',
  };

  const pipColor: Record<PlayerColor, string> = {
    red: 'bg-rose-600',
    yellow: 'bg-amber-600',
    green: 'bg-emerald-600',
    blue: 'bg-sky-600',
  };

  // 3x3 pip positions for values 1 to 6
  const renderPips = (val: number | null) => {
    if (val === null) {
      return (
        <span className="text-xl sm:text-2xl font-black text-slate-400 animate-pulse">
          ?
        </span>
      );
    }

    // Positions on a 3x3 grid:
    // 0 1 2
    // 3 4 5
    // 6 7 8
    const pipPositions: Record<number, number[]> = {
      1: [4],
      2: [2, 6],
      3: [2, 4, 6],
      4: [0, 2, 6, 8],
      5: [0, 2, 4, 6, 8],
      6: [0, 2, 3, 5, 6, 8],
    };

    const activePips = new Set(pipPositions[val] || [4]);

    return (
      <div className="grid grid-cols-3 grid-rows-3 w-10 h-10 sm:w-12 sm:h-12 p-1.5 gap-1 place-items-center">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full transition-transform ${
              activePips.has(i)
                ? `${pipColor[color]} shadow-sm scale-100`
                : 'opacity-0 scale-50'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-1.5 select-none">
      <button
        onClick={handleClick}
        disabled={!canRoll || disabled || isRolling}
        className={`relative group rounded-2xl p-1.5 transition-all duration-200 transform ${
          canRoll && !disabled && !isRolling
            ? 'cursor-pointer hover:scale-105 active:scale-95 animate-bounce'
            : 'cursor-not-allowed opacity-90'
        }`}
        title={canRoll ? 'Click to Roll Dice!' : 'Waiting...'}
      >
        {/* Glow Ring when it's your turn to roll */}
        {canRoll && !disabled && (
          <span className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-amber-400 to-rose-500 opacity-75 blur-sm animate-pulse" />
        )}

        {/* Dice Body */}
        <div
          className={`relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-b from-white via-slate-100 to-slate-200 flex items-center justify-center border-2 border-slate-300 shadow-xl transition-all ${
            isRolling ? 'animate-roll ring-4 ring-amber-400' : ''
          } ${canRoll ? `ring-2 ring-offset-2 ring-offset-slate-900 ${colorGradients[color]}` : ''}`}
        >
          {/* Subtle inner corner bevel */}
          <div className="absolute inset-0.5 rounded-[10px] border border-white/60 pointer-events-none" />

          {/* Pips */}
          {renderPips(value)}
        </div>
      </button>

      {/* Action prompt badge */}
      {canRoll && !disabled && !isRolling && (
        <span className="text-[11px] font-bold text-amber-300 tracking-wide uppercase px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 animate-pulse">
          TAP TO ROLL!
        </span>
      )}
    </div>
  );
};
