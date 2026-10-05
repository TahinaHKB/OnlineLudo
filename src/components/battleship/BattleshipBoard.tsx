import React, { useState } from 'react';
import { 
  BattleshipGame, 
  GRID_COLS, 
  GRID_ROWS, 
  PlacedShip, 
  ShotRecord 
} from '../../types/battleship';
import { sounds } from '../../utils/audio';
import { 
  Crosshair, 
  Flame, 
  Droplet, 
  Shield, 
  Compass, 
  Sparkles,
  Trophy
} from 'lucide-react';

interface BattleshipBoardProps {
  game: BattleshipGame;
  mySlot: 'player1' | 'player2';
  isMyTurn: boolean;
  onFire: (r: number, c: number) => void;
  disabled?: boolean;
}

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7'];

export const BattleshipBoard: React.FC<BattleshipBoardProps> = ({
  game,
  mySlot,
  isMyTurn,
  onFire,
  disabled = false,
}) => {
  const [activeTab, setActiveTab] = useState<'radar' | 'fleet'>('radar');

  const opponentSlot = mySlot === 'player1' ? 'player2' : 'player1';
  const myState = mySlot === 'player1' ? game.player1 : game.player2!;
  const opponentState = opponentSlot === 'player1' ? game.player1 : game.player2!;

  // My shots against opponent fleet
  const shotsAgainstOpponent = opponentState.shotsReceived || [];
  // Opponent shots against my fleet
  const shotsAgainstMe = myState.shotsReceived || [];

  const handleCellClick = (r: number, c: number) => {
    if (!isMyTurn || disabled) return;
    if (shotsAgainstOpponent.some((s) => s.r === r && s.c === c)) return;

    sounds.playCannon();
    onFire(r, c);
  };

  const mySunkCount = myState.ships.filter((s) => s.sunk).length;
  const oppSunkCount = opponentState.ships.filter((s) => s.sunk).length;

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Mobile Tab Switcher */}
      <div className="flex md:hidden rounded-2xl bg-sky-950/80 border border-sky-800/60 p-1.5 shadow-md">
        <button
          onClick={() => setActiveTab('radar')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'radar'
              ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 shadow-md scale-[1.02]'
              : 'text-sky-300 hover:text-white'
          }`}
        >
          <Crosshair className="w-4 h-4" />
          <span>🎯 Grille de Tir ({5 - oppSunkCount} restants)</span>
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'fleet'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md scale-[1.02]'
              : 'text-sky-300 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>⛵ Mes Navires ({5 - mySunkCount} à flot)</span>
        </button>
      </div>

      {/* Main Boards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-start">
        {/* Radar / Target Grid (Attack) */}
        <div
          className={`rounded-3xl bg-gradient-to-b from-sky-950/80 via-slate-900/95 to-slate-950 border-2 p-4 sm:p-5 shadow-2xl transition-all ${
            isMyTurn
              ? 'border-amber-400/80 ring-2 ring-amber-400/30'
              : 'border-sky-900/60 opacity-90'
          } ${activeTab !== 'radar' ? 'hidden md:block' : 'block'}`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-sky-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <h3 className="font-display font-black text-white text-base sm:text-lg">
                Zone d'Attaque (Lagune 7×9)
              </h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-amber-500/20 font-black text-amber-300 border border-amber-500/40">
              {5 - oppSunkCount} / 5 navires à couler
            </span>
          </div>

          <p className="text-xs text-sky-200/80 mb-3 font-medium">
            {isMyTurn
              ? '✨ Clique sur l\'eau pour lancer une torpille !'
              : "⏳ L'adversaire est en train de viser..."}
          </p>

          {/* 7x9 Attack Grid */}
          <div className="flex flex-col items-center">
            <div className="p-2 sm:p-3 rounded-2xl bg-sky-950/80 border-2 border-sky-800/60 shadow-inner">
              {/* Col labels 1..7 */}
              <div className="flex pl-6 mb-1 text-[11px] font-black font-display text-sky-300">
                {COL_LABELS.map((col) => (
                  <div key={col} className="w-8 sm:w-10 text-center">
                    {col}
                  </div>
                ))}
              </div>

              {/* Rows A..I */}
              <div className="space-y-1">
                {ROW_LABELS.map((rowLabel, r) => (
                  <div key={rowLabel} className="flex items-center">
                    <span className="w-6 text-[11px] font-black font-display text-sky-300 text-center">
                      {rowLabel}
                    </span>

                    <div className="flex gap-1">
                      {Array.from({ length: GRID_COLS }).map((_, c) => {
                        const shot = shotsAgainstOpponent.find(
                          (s) => s.r === r && s.c === c
                        );

                        let content = null;
                        let cellStyle =
                          'bg-sky-900/40 border-sky-700/50 hover:bg-amber-500/20 hover:border-amber-400 cursor-pointer active:scale-95';

                        if (shot) {
                          if (shot.isHit) {
                            cellStyle =
                              'bg-gradient-to-tr from-amber-500 to-rose-600 border-amber-300 text-white shadow-lg animate-hit-blast cursor-not-allowed';
                            content = (
                              <span className="text-base sm:text-lg animate-bounce drop-shadow">
                                💥
                              </span>
                            );
                          } else {
                            cellStyle =
                              'bg-sky-950/60 border-sky-700/40 text-cyan-300 cursor-not-allowed';
                            content = (
                              <span className="text-sm sm:text-base opacity-90 select-none">
                                💧
                              </span>
                            );
                          }
                        }

                        return (
                          <button
                            key={`${r}-${c}`}
                            onClick={() => handleCellClick(r, c)}
                            disabled={!isMyTurn || !!shot || disabled}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center transition-all ${cellStyle}`}
                          >
                            {content}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Defense / My Fleet Grid */}
        <div
          className={`rounded-3xl bg-gradient-to-b from-blue-950/80 via-slate-900/95 to-slate-950 border-2 border-blue-800/40 p-4 sm:p-5 shadow-2xl ${
            activeTab !== 'fleet' ? 'hidden md:block' : 'block'
          }`}
        >
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-blue-800/40">
            <div className="flex items-center gap-2">
              <span className="text-xl">🛡️</span>
              <h3 className="font-display font-black text-white text-base sm:text-lg">
                Ta Flotte (Défense)
              </h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 font-black text-cyan-300 border border-cyan-500/40">
              {5 - mySunkCount} / 5 navires sains
            </span>
          </div>

          <p className="text-xs text-sky-200/80 mb-3 font-medium">
            Position de tes navires et tirs ennemis reçus.
          </p>

          {/* 7x9 Defense Grid */}
          <div className="flex flex-col items-center">
            <div className="p-2 sm:p-3 rounded-2xl bg-blue-950/80 border-2 border-blue-800/60 shadow-inner">
              {/* Col labels 1..7 */}
              <div className="flex pl-6 mb-1 text-[11px] font-black font-display text-sky-300">
                {COL_LABELS.map((col) => (
                  <div key={col} className="w-8 sm:w-10 text-center">
                    {col}
                  </div>
                ))}
              </div>

              {/* Rows A..I */}
              <div className="space-y-1">
                {ROW_LABELS.map((rowLabel, r) => (
                  <div key={rowLabel} className="flex items-center">
                    <span className="w-6 text-[11px] font-black font-display text-sky-300 text-center">
                      {rowLabel}
                    </span>

                    <div className="flex gap-1">
                      {Array.from({ length: GRID_COLS }).map((_, c) => {
                        const ship = myState.ships.find((s) =>
                          s.positions.some((pos) => pos.r === r && pos.c === c)
                        );
                        const enemyShot = shotsAgainstMe.find(
                          (s) => s.r === r && s.c === c
                        );

                        let content = null;
                        let cellStyle = 'bg-sky-950/50 border-sky-800/40';

                        if (ship && enemyShot && enemyShot.isHit) {
                          cellStyle =
                            'bg-gradient-to-tr from-rose-600 to-amber-600 border-amber-300 text-white shadow animate-pulse';
                          content = <span className="text-base">🔥</span>;
                        } else if (ship) {
                          cellStyle =
                            'bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 border-cyan-300 text-white shadow-md';
                          content = (
                            <span className="text-sm drop-shadow select-none">
                              {ship.icon}
                            </span>
                          );
                        } else if (enemyShot) {
                          cellStyle = 'bg-sky-900/30 border-sky-700/40 text-cyan-400';
                          content = <span className="text-xs">💧</span>;
                        }

                        return (
                          <div
                            key={`${r}-${c}`}
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center ${cellStyle}`}
                          >
                            {content}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Playful Fleet Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-3xl bg-slate-900/80 border border-sky-800/40 shadow-lg">
        {/* Your ships */}
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-sky-300 block mb-2 flex items-center gap-1.5">
            <span>Tes Bateaux :</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {myState.ships.map((ship) => (
              <div
                key={ship.id}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  ship.sunk
                    ? 'bg-rose-950/40 border-rose-700 text-rose-300 line-through opacity-60'
                    : 'bg-sky-950 border-sky-700 text-white'
                }`}
              >
                <span>{ship.icon}</span>
                <span>{ship.name}</span>
                <span className="text-[10px] text-sky-300">({ship.size}c)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Opponent ships */}
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-300 block mb-2 flex items-center gap-1.5">
            <span>Bateaux Ennemis :</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {opponentState.ships.map((ship) => (
              <div
                key={ship.id}
                className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
                  ship.sunk
                    ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <span>{ship.sunk ? '☠️' : ship.icon}</span>
                <span>{ship.sunk ? `${ship.name} Coulé !` : ship.name}</span>
                <span className="text-[10px]">({ship.size}c)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
