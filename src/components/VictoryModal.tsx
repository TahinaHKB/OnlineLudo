import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState, PlayerSlot } from '../types/ludo';
import { Trophy, RotateCcw, Home, Sparkles } from 'lucide-react';
import { sounds } from '../utils/audio';

interface VictoryModalProps {
  game: GameState;
  mySlot: PlayerSlot | null;
  onRematch: () => void;
  onReturnToLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  game,
  mySlot,
  onRematch,
  onReturnToLobby,
}) => {
  const winnerSlot = game.winner;
  if (!winnerSlot) return null;

  const winnerPlayer = game[winnerSlot]!;
  const isWinner = mySlot !== null && mySlot === winnerSlot;

  useEffect(() => {
    sounds.playWin();
    // Confetti cannon
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.55 },
      });
      const timeout = setTimeout(() => {
        confetti({
          particleCount: 80,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
        });
        confetti({
          particleCount: 80,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
        });
      }, 400);
      return () => clearTimeout(timeout);
    } catch {
      // ignore
    }
  }, []);

  const p1Home = game.tokens.player1.filter((t) => t.step === 56).length;
  const p2Home = game.player2 ? game.tokens.player2.filter((t) => t.step === 56).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-500/50 p-6 sm:p-8 text-center shadow-2xl shadow-amber-500/20 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Trophy icon */}
        <div className="relative mx-auto mb-4 w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-rose-500 p-0.5 shadow-xl shadow-amber-500/30">
          <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center">
            <Trophy className="w-10 h-10 text-amber-400 animate-bounce" />
          </div>
        </div>

        {/* Title */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          {isWinner ? 'Victory is Yours!' : 'Game Over'}
        </div>

        <h2 className="text-3xl sm:text-4xl font-black font-display text-white mb-1">
          {winnerPlayer.name} Won!
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          {isWinner
            ? 'Incredible strategy and dice mastery!'
            : 'Well fought! Challenge again for redemption.'}
        </p>

        {/* Score Summary Box */}
        <div className="rounded-2xl bg-slate-800/80 border border-slate-700/80 p-4 mb-6">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Tokens in Goal
          </div>
          <div className="flex items-center justify-around divide-x divide-slate-700">
            {/* Player 1 */}
            <div className="px-4 flex flex-col items-center">
              <span className="text-sm font-semibold text-rose-400 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
                {game.player1.name}
              </span>
              <span className="text-2xl font-black font-display text-white mt-1">
                {p1Home} <span className="text-sm text-slate-400 font-normal">/ {game.targetTokensHome || 4}</span>
              </span>
            </div>

            {/* Player 2 */}
            <div className="px-4 flex flex-col items-center">
              <span className="text-sm font-semibold text-amber-400 flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                {game.player2 ? game.player2.name : 'Opponent'}
              </span>
              <span className="text-2xl font-black font-display text-white mt-1">
                {p2Home} <span className="text-sm text-slate-400 font-normal">/ {game.targetTokensHome || 4}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={onReturnToLobby}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-sm transition-colors border border-slate-700 flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Lobby</span>
          </button>

          <button
            onClick={onRematch}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-rose-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
};
