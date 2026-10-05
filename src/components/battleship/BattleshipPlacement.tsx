import React, { useState } from 'react';
import { 
  Coord, 
  FLEET_CONFIG, 
  GRID_COLS, 
  GRID_ROWS, 
  PlacedShip, 
  ShipDefinition 
} from '../../types/battleship';
import { 
  canPlaceShip, 
  generateRandomFleet, 
  getShipCoordinates 
} from '../../utils/battleshipRules';
import { sounds } from '../../utils/audio';
import { 
  Anchor, 
  RotateCw, 
  Shuffle, 
  RotateCcw, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles,
  Info,
  Compass
} from 'lucide-react';

interface BattleshipPlacementProps {
  playerName: string;
  onFleetConfirmed: (ships: PlacedShip[]) => void;
}

const ROW_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];
const COL_LABELS = ['1', '2', '3', '4', '5', '6', '7'];

export const BattleshipPlacement: React.FC<BattleshipPlacementProps> = ({
  playerName,
  onFleetConfirmed,
}) => {
  const [placedShips, setPlacedShips] = useState<PlacedShip[]>([]);
  const [selectedShipIndex, setSelectedShipIndex] = useState<number>(0);
  const [isVertical, setIsVertical] = useState<boolean>(false);
  const [hoverCoord, setHoverCoord] = useState<Coord | null>(null);

  const currentShipDef: ShipDefinition | null =
    selectedShipIndex < FLEET_CONFIG.length ? FLEET_CONFIG[selectedShipIndex] : null;

  // Check if hover coordinates are valid
  const isValidHover =
    currentShipDef && hoverCoord
      ? canPlaceShip(
          placedShips,
          currentShipDef.size,
          hoverCoord.r,
          hoverCoord.c,
          isVertical,
          GRID_COLS,
          GRID_ROWS
        )
      : false;

  const hoverCoordinates =
    currentShipDef && hoverCoord
      ? getShipCoordinates(hoverCoord.r, hoverCoord.c, currentShipDef.size, isVertical)
      : [];

  const handleCellClick = (r: number, c: number) => {
    if (!currentShipDef) return;

    if (canPlaceShip(placedShips, currentShipDef.size, r, c, isVertical, GRID_COLS, GRID_ROWS)) {
      sounds.playMove();
      const newShip: PlacedShip = {
        id: `${currentShipDef.id}_${Date.now()}`,
        name: currentShipDef.name,
        size: currentShipDef.size,
        icon: currentShipDef.icon,
        positions: getShipCoordinates(r, c, currentShipDef.size, isVertical),
        isVertical,
        hits: 0,
        sunk: false,
      };

      const updated = [...placedShips, newShip];
      setPlacedShips(updated);
      setSelectedShipIndex(updated.length);
    } else {
      sounds.playTurn();
    }
  };

  const handleRandomize = () => {
    sounds.playMove();
    const randomized = generateRandomFleet();
    setPlacedShips(randomized);
    setSelectedShipIndex(FLEET_CONFIG.length);
  };

  const handleReset = () => {
    sounds.playTurn();
    setPlacedShips([]);
    setSelectedShipIndex(0);
  };

  const handleConfirm = () => {
    if (placedShips.length !== FLEET_CONFIG.length) return;
    sounds.playSonar();
    onFleetConfirmed(placedShips);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 bg-gradient-to-b from-sky-950/90 via-slate-900/95 to-slate-950 border-2 border-sky-600/30 rounded-3xl shadow-2xl text-slate-100">
      {/* Playful Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-sky-800/40">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-400 to-cyan-400 p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-2xl">
              ⛵
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-400/40 text-[11px] font-bold uppercase tracking-wider mb-1">
              <Compass className="w-3 h-3 text-amber-400" />
              Terrain 7×9 • Préparation secrète
            </div>
            <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
              Déploie tes 5 navires, {playerName} !
            </h2>
            <p className="text-xs sm:text-sm text-sky-200/80">
              Place tes bateaux à l'abri des regards. Ton adversaire ne pourra rien voir !
            </p>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleRandomize}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs border border-amber-500/40 shadow-sm transition-all hover:scale-105 active:scale-95"
            title="Disposition automatique amusante"
          >
            <Shuffle className="w-3.5 h-3.5 text-amber-400" />
            <span>Aléatoire 🎲</span>
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-xs border border-slate-700 transition-colors"
            title="Tout effacer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Effacer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left: Ships List & Friendly Controls */}
        <div className="md:col-span-5 space-y-4">
          <div className="p-4 rounded-2xl bg-sky-950/40 border border-sky-800/40 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-sky-300 flex items-center gap-1">
                <span>Tes Navires</span>
                <span className="text-amber-400">({placedShips.length}/5)</span>
              </span>
              <button
                onClick={() => setIsVertical(!isVertical)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-xs font-black hover:opacity-95 shadow transition-transform active:scale-95"
              >
                <RotateCw className="w-3 h-3" />
                <span>{isVertical ? '↕ Vertical' : '↔ Horizontal'}</span>
              </button>
            </div>

            <div className="space-y-2">
              {FLEET_CONFIG.map((ship, idx) => {
                const isPlaced = idx < placedShips.length;
                const isCurrent = idx === selectedShipIndex;

                return (
                  <div
                    key={ship.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isPlaced
                        ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                        : isCurrent
                        ? 'bg-sky-600/30 border-amber-400 shadow-md ring-2 ring-amber-400/40 text-white scale-[1.02]'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-2xl drop-shadow">{ship.icon}</span>
                      <div>
                        <div className="text-xs font-bold flex items-center gap-1.5 text-white">
                          <span>{ship.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-sky-900/80 text-sky-200 border border-sky-700/60">
                            {ship.size} cases
                          </span>
                        </div>
                      </div>
                    </div>

                    {isPlaced ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Prêt</span>
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 animate-bounce">
                        Place-le !
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Friendly Tip */}
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-200 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Astuce :</strong> Clique sur l'eau pour poser ton bateau. Utilise le bouton "Aléatoire 🎲" si tu veux commencer tout de suite !
            </span>
          </div>

          {/* Confirm Button */}
          <button
            onClick={handleConfirm}
            disabled={placedShips.length !== FLEET_CONFIG.length}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-500 hover:opacity-95 text-slate-950 font-black text-sm sm:text-base shadow-xl shadow-teal-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ShieldCheck className="w-5 h-5 text-slate-950" />
            <span>C'est parti ! Valider la flotte ({placedShips.length}/5)</span>
          </button>
        </div>

        {/* Right: Friendly 7x9 Lagoon Grid */}
        <div className="md:col-span-7 flex flex-col items-center">
          <div className="relative p-3 sm:p-4 rounded-3xl bg-gradient-to-b from-sky-900/60 to-blue-950 border-2 border-sky-400/40 shadow-2xl">
            {/* Column labels 1..7 */}
            <div className="flex pl-6 mb-1 text-[11px] font-black font-display text-sky-300">
              {COL_LABELS.map((col) => (
                <div key={col} className="w-8 sm:w-10 text-center">
                  {col}
                </div>
              ))}
            </div>

            {/* Grid rows A..I */}
            <div className="space-y-1">
              {ROW_LABELS.map((rowLabel, r) => (
                <div key={rowLabel} className="flex items-center">
                  {/* Row label */}
                  <span className="w-6 text-[11px] font-black font-display text-sky-300 text-center">
                    {rowLabel}
                  </span>

                  {/* 7 Columns */}
                  <div className="flex gap-1">
                    {Array.from({ length: GRID_COLS }).map((_, c) => {
                      // Check if already placed
                      const placedShip = placedShips.find((s) =>
                        s.positions.some((pos) => pos.r === r && pos.c === c)
                      );

                      // Check if in current hover preview
                      const isHovered = hoverCoordinates.some((pos) => pos.r === r && pos.c === c);

                      let cellBg =
                        'bg-sky-950/80 border-sky-700/50 hover:bg-sky-800/60 hover:border-amber-400';
                      if (placedShip) {
                        cellBg =
                          'bg-gradient-to-tr from-cyan-500 via-blue-500 to-indigo-600 border-cyan-300 shadow-md scale-95';
                      } else if (isHovered) {
                        cellBg = isValidHover
                          ? 'bg-emerald-500/60 border-emerald-300 scale-95 animate-pulse'
                          : 'bg-rose-500/60 border-rose-300 scale-95 animate-pulse';
                      }

                      return (
                        <div
                          key={`${r}-${c}`}
                          onClick={() => handleCellClick(r, c)}
                          onMouseEnter={() => setHoverCoord({ r, c })}
                          onMouseLeave={() => setHoverCoord(null)}
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl border-2 flex items-center justify-center cursor-pointer transition-all ${cellBg}`}
                        >
                          {placedShip && (
                            <span className="text-sm sm:text-base drop-shadow select-none">
                              {placedShip.icon}
                            </span>
                          )}
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
  );
};
