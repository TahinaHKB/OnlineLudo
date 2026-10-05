import React, { useMemo } from 'react';
import { 
  GameState, 
  PlayerSlot, 
  Token, 
  PlayerColor 
} from '../types/ludo';
import { 
  getCoordinatesForStep, 
  getGlobalTrackIndex, 
  SAFE_TRACK_INDICES, 
  MAIN_TRACK,
  HOME_STRETCHES 
} from '../utils/boardCoordinates';
import { sounds } from '../utils/audio';

interface LudoBoardProps {
  game: GameState;
  mySlot: PlayerSlot | null;
  onTokenClick: (tokenIndex: number) => void;
}

export const LudoBoard: React.FC<LudoBoardProps> = ({
  game,
  mySlot,
  onTokenClick,
}) => {
  const isMyTurn = mySlot !== null && game.currentTurn === mySlot && game.diceRolled;
  const validMoves = game.validMoves || [];

  // Group tokens at identical coordinates to apply stack offsets
  const tokenCoordinates = useMemo(() => {
    const list: Array<{
      slot: PlayerSlot;
      token: Token;
      index: number;
      color: PlayerColor;
      x: number;
      y: number;
      isMovable: boolean;
      key: string;
    }> = [];

    // Player 1 tokens
    const p1Color = game.player1.color;
    game.tokens.player1.forEach((token, index) => {
      const coord = getCoordinatesForStep(p1Color, token.step, index);
      const isMovable = isMyTurn && mySlot === 'player1' && validMoves.includes(index);
      list.push({
        slot: 'player1',
        token,
        index,
        color: p1Color,
        x: coord.x,
        y: coord.y,
        isMovable,
        key: `p1_token_${index}`,
      });
    });

    // Player 2 tokens
    if (game.player2) {
      const p2Color = game.player2.color;
      game.tokens.player2.forEach((token, index) => {
        const coord = getCoordinatesForStep(p2Color, token.step, index);
        const isMovable = isMyTurn && mySlot === 'player2' && validMoves.includes(index);
        list.push({
          slot: 'player2',
          token,
          index,
          color: p2Color,
          x: coord.x,
          y: coord.y,
          isMovable,
          key: `p2_token_${index}`,
        });
      });
    }

    // Compute stack offsets for overlapping tokens on the track/goal
    const clusters: Record<string, typeof list> = {};
    list.forEach((item) => {
      // Cluster key rounded to 1 decimal
      const k = `${Math.round(item.x * 10)}_${Math.round(item.y * 10)}`;
      if (!clusters[k]) clusters[k] = [];
      clusters[k].push(item);
    });

    return list.map((item) => {
      const k = `${Math.round(item.x * 10)}_${Math.round(item.y * 10)}`;
      const cluster = clusters[k];
      if (cluster.length > 1 && item.token.step !== -1) {
        const subIndex = cluster.indexOf(item);
        const offsets = [
          { dx: -1.2, dy: -1.2 },
          { dx: 1.2, dy: 1.2 },
          { dx: -1.2, dy: 1.2 },
          { dx: 1.2, dy: -1.2 },
        ];
        const off = offsets[subIndex % offsets.length];
        return {
          ...item,
          x: item.x + off.dx,
          y: item.y + off.dy,
        };
      }
      return item;
    });
  }, [game, mySlot, isMyTurn, validMoves]);

  const handleTokenSelect = (item: typeof tokenCoordinates[0]) => {
    if (!item.isMovable) return;
    sounds.playMove();
    onTokenClick(item.index);
  };

  // Safe track index lookup
  const isCellSafeTrack = (r: number, c: number) => {
    const trackIndex = MAIN_TRACK.findIndex((cell) => cell.r === r && cell.c === c);
    return trackIndex !== -1 && SAFE_TRACK_INDICES.has(trackIndex);
  };

  const getCellColor = (r: number, c: number) => {
    // Red Start
    if (r === 6 && c === 1) return 'bg-rose-500 text-white';
    // Green Start
    if (r === 1 && c === 8) return 'bg-emerald-500 text-white';
    // Yellow Start
    if (r === 8 && c === 13) return 'bg-amber-400 text-slate-900';
    // Blue Start
    if (r === 13 && c === 6) return 'bg-sky-500 text-white';

    // Red home stretch
    if (r === 7 && c >= 1 && c <= 5) return 'bg-rose-500/80';
    // Green home stretch
    if (c === 7 && r >= 1 && r <= 5) return 'bg-emerald-500/80';
    // Yellow home stretch
    if (r === 7 && c >= 9 && c <= 13) return 'bg-amber-400/80';
    // Blue home stretch
    if (c === 7 && r >= 9 && r <= 13) return 'bg-sky-500/80';

    return 'bg-slate-100 hover:bg-slate-200/90';
  };

  return (
    <div className="relative w-full max-w-[min(90vw,540px)] aspect-square mx-auto rounded-3xl bg-slate-900 p-2 sm:p-3 shadow-2xl shadow-slate-950/80 border-4 border-slate-800 select-none">
      {/* 15x15 Ludo Board Grid */}
      <div className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-900 border border-slate-700/80 grid grid-cols-15 grid-rows-15">
        
        {/* --- 4 YARD BASES (6x6 each) --- */}
        {/* Red Base (Top-Left: r 0..5, c 0..5) */}
        <div className="col-start-1 col-end-7 row-start-1 row-end-7 bg-rose-600 p-2 sm:p-3 flex items-center justify-center border-r-2 border-b-2 border-slate-800">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-rose-100 border-2 border-rose-300 shadow-inner flex items-center justify-center"
              >
                <div className="w-3 h-3 rounded-full bg-rose-500/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Green Base (Top-Right: r 0..5, c 9..14) */}
        <div className="col-start-10 col-end-16 row-start-1 row-end-7 bg-emerald-600 p-2 sm:p-3 flex items-center justify-center border-l-2 border-b-2 border-slate-800">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-emerald-100 border-2 border-emerald-300 shadow-inner flex items-center justify-center"
              >
                <div className="w-3 h-3 rounded-full bg-emerald-500/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Blue Base (Bottom-Left: r 9..14, c 0..5) */}
        <div className="col-start-1 col-end-7 row-start-10 row-end-16 bg-sky-600 p-2 sm:p-3 flex items-center justify-center border-r-2 border-t-2 border-slate-800">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-sky-100 border-2 border-sky-300 shadow-inner flex items-center justify-center"
              >
                <div className="w-3 h-3 rounded-full bg-sky-500/30" />
              </div>
            ))}
          </div>
        </div>

        {/* Yellow Base (Bottom-Right: r 9..14, c 9..14) */}
        <div className="col-start-10 col-end-16 row-start-10 row-end-16 bg-amber-400 p-2 sm:p-3 flex items-center justify-center border-l-2 border-t-2 border-slate-800">
          <div className="w-full h-full rounded-2xl bg-white/95 shadow-inner p-2 grid grid-cols-2 grid-rows-2 gap-2 place-items-center">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-7 h-7 sm:w-10 sm:h-10 rounded-full bg-amber-100 border-2 border-amber-300 shadow-inner flex items-center justify-center"
              >
                <div className="w-3 h-3 rounded-full bg-amber-500/30" />
              </div>
            ))}
          </div>
        </div>

        {/* --- CENTER HOME TRIANGLES (3x3: r 6..8, c 6..8) --- */}
        <div className="col-start-7 col-end-10 row-start-7 row-end-10 relative bg-slate-900 overflow-hidden border border-slate-700">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {/* Top triangle: Green */}
            <polygon points="0,0 100,0 50,50" fill="#059669" />
            {/* Right triangle: Yellow */}
            <polygon points="100,0 100,100 50,50" fill="#f59e0b" />
            {/* Bottom triangle: Blue */}
            <polygon points="100,100 0,100 50,50" fill="#0284c7" />
            {/* Left triangle: Red */}
            <polygon points="0,100 0,0 50,50" fill="#e11d48" />
            {/* Center golden medallion */}
            <circle cx="50" cy="50" r="14" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" />
            <text x="50" y="54" fontSize="10" textAnchor="middle" fill="#fbbf24" fontWeight="bold">
              ★
            </text>
          </svg>
        </div>

        {/* --- TRACK CELLS (15x15 board cells) --- */}
        {Array.from({ length: 15 }).map((_, r) =>
          Array.from({ length: 15 }).map((__, c) => {
            // Skip corners (handled by yard bases)
            const inYard =
              (r < 6 && c < 6) ||
              (r < 6 && c > 8) ||
              (r > 8 && c < 6) ||
              (r > 8 && c > 8);
            
            // Skip center (handled by center home triangles)
            const inCenter = r >= 6 && r <= 8 && c >= 6 && c <= 8;

            if (inYard || inCenter) return null;

            const isSafe = isCellSafeTrack(r, c);
            const cellStyle = getCellColor(r, c);

            // Starting arrow markers
            const isRedStart = r === 6 && c === 1;
            const isGreenStart = r === 1 && c === 8;
            const isYellowStart = r === 8 && c === 13;
            const isBlueStart = r === 13 && c === 6;

            return (
              <div
                key={`${r}-${c}`}
                style={{
                  gridColumnStart: c + 1,
                  gridRowStart: r + 1,
                }}
                className={`relative flex items-center justify-center border-[0.5px] border-slate-300/60 font-sans transition-colors ${cellStyle}`}
              >
                {/* Safe Star Indicator */}
                {isSafe && !isRedStart && !isGreenStart && !isYellowStart && !isBlueStart && (
                  <span className="text-[9px] sm:text-xs text-amber-500 font-black leading-none drop-shadow-sm select-none">
                    ★
                  </span>
                )}

                {/* Start Arrow Indicators */}
                {isRedStart && <span className="text-[10px] sm:text-xs font-bold">➜</span>}
                {isGreenStart && <span className="text-[10px] sm:text-xs font-bold">➜</span>}
                {isYellowStart && <span className="text-[10px] sm:text-xs font-bold">➜</span>}
                {isBlueStart && <span className="text-[10px] sm:text-xs font-bold">➜</span>}
              </div>
            );
          })
        )}

        {/* --- TOKENS OVERLAY LAYER --- */}
        {tokenCoordinates.map((item) => {
          const colorStyles: Record<PlayerColor, string> = {
            red: 'bg-gradient-to-b from-rose-400 to-rose-600 border-white shadow-rose-900/50',
            yellow: 'bg-gradient-to-b from-amber-300 to-amber-500 border-slate-900 text-slate-950 shadow-amber-900/50',
            green: 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-white shadow-emerald-900/50',
            blue: 'bg-gradient-to-b from-sky-400 to-sky-600 border-white shadow-sky-900/50',
          };

          const isP1 = item.slot === 'player1';
          const wasJustMoved =
            game.lastMove &&
            game.lastMove.player === item.slot &&
            game.lastMove.tokenId === item.index &&
            Date.now() - game.lastMove.timestamp < 1800;

          return (
            <div
              key={item.key}
              onClick={() => handleTokenSelect(item)}
              style={{
                position: 'absolute',
                left: `${item.x}%`,
                top: `${item.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: wasJustMoved ? 40 : item.isMovable ? 30 : 20,
              }}
              className={`transition-all duration-500 ease-out ${
                item.isMovable
                  ? 'cursor-pointer hover:scale-125'
                  : 'pointer-events-none'
              } ${wasJustMoved ? 'animate-token-hop' : ''}`}
            >
              {/* Pulsing ring around active movable tokens */}
              {item.isMovable && (
                <div className="absolute -inset-1.5 rounded-full bg-amber-400 animate-pulse-ring" />
              )}

              {/* 3D Circular Token */}
              <div
                className={`relative w-5 h-5 sm:w-7 sm:h-7 rounded-full border-2 shadow-lg flex items-center justify-center font-bold text-[9px] sm:text-xs transition-transform ${
                  colorStyles[item.color]
                } ${item.isMovable ? 'scale-110 -translate-y-0.5' : ''}`}
              >
                {/* Inner gloss highlight */}
                <div className="absolute top-0.5 left-1 w-2 sm:w-2.5 h-1 sm:h-1.5 rounded-full bg-white/50 pointer-events-none" />

                {/* Token identifier number */}
                <span className="font-display drop-shadow select-none">
                  {item.index + 1}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
