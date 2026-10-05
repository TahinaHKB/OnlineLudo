import React, { useState, useEffect, useRef, useTransition } from 'react';
import { 
  BattleshipGame, 
  PlacedShip 
} from '../../types/battleship';
import { useAuth } from '../../context/AuthContext';
import { battleshipService } from '../../services/battleshipService';
import { BattleshipPlacement } from './BattleshipPlacement';
import { BattleshipBoard } from './BattleshipBoard';
import { getSmartBotShot } from '../../utils/battleshipRules';
import { sounds } from '../../utils/audio';
import confetti from 'canvas-confetti';
import { 
  Anchor, 
  Copy, 
  Check, 
  Flag, 
  RotateCcw, 
  Home, 
  Sparkles, 
  Trophy, 
  Eye, 
  EyeOff,
  Bot
} from 'lucide-react';

interface BattleshipScreenProps {
  initialGame: BattleshipGame;
  onExitGame: () => void;
}

export const BattleshipScreen: React.FC<BattleshipScreenProps> = ({
  initialGame,
  onExitGame,
}) => {
  const { userProfile, recordMatchResult } = useAuth();
  const [game, setGame] = useState<BattleshipGame>(initialGame);
  const [copiedCode, setCopiedCode] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [localPassReveal, setLocalPassReveal] = useState(false);
  const [, startTransition] = useTransition();

  const prevLastShotRef = useRef<number>(game.lastShot?.timestamp || 0);
  const botTurnHandledRef = useRef<number>(-1);

  // Identify player's slot
  const mySlot: 'player1' | 'player2' = (() => {
    if (!userProfile) return 'player1';
    if (game.mode === 'local') {
      return game.currentTurn; // Local player controls whichever slot is active
    }
    if (game.player1.uid === userProfile.id) return 'player1';
    if (game.player2 && game.player2.uid === userProfile.id) return 'player2';
    return 'player1';
  })();

  const isMyTurn = mySlot === game.currentTurn && game.status === 'playing';

  // Real-time Firestore listener for online mode
  useEffect(() => {
    if (game.mode !== 'online') return;

    const unsub = battleshipService.subscribeToGame(game.id, (updated) => {
      startTransition(() => {
        setGame(updated);
      });

      // Check if shot was fired
      if (
        updated.lastShot &&
        updated.lastShot.timestamp !== prevLastShotRef.current
      ) {
        prevLastShotRef.current = updated.lastShot.timestamp;

        if (updated.lastShot.sunkShipName) {
          sounds.playShipSunk();
          const isMe = updated.lastShot.shooter === mySlot;
          setNotification(
            isMe
              ? `🎉 ${updated.lastShot.sunkShipName} adverse COULÉ ! Rejouez !`
              : `🚨 Votre ${updated.lastShot.sunkShipName} a coulé ! L'adversaire rejoue !`
          );
        } else if (updated.lastShot.isHit) {
          sounds.playExplosion();
          const isMe = updated.lastShot.shooter === mySlot;
          setNotification(
            isMe ? '💥 TOUCHÉ ! Rejouez !' : "💥 Votre flotte a été touchée ! L'adversaire rejoue !"
          );
        } else {
          sounds.playSplash();
          const isMe = updated.lastShot.shooter === mySlot;
          setNotification(
            isMe ? "💧 À l'eau ! Au tour de l'adversaire..." : "💧 Tir adverse à l'eau ! À vous de tirer !"
          );
        }

        setTimeout(() => setNotification(null), 3000);
      }
    });

    return () => unsub();
  }, [game.id, game.mode]);

  // AI Bot automated shooting - completely fixed & robust!
  useEffect(() => {
    if (game.mode !== 'bot' || game.status !== 'playing') return;
    if (game.currentTurn !== 'player2') return;

    // Use current shot count as unique turn identifier
    const currentShotCount = game.player1.shotsReceived?.length || 0;
    if (botTurnHandledRef.current === currentShotCount) return;
    botTurnHandledRef.current = currentShotCount;

    setIsBotThinking(true);

    const timer = setTimeout(async () => {
      const p1ReceivedShots = game.player1.shotsReceived || [];
      const botTarget = getSmartBotShot(p1ReceivedShots);

      const result = await battleshipService.fireShot(
        game,
        'player2',
        botTarget.r,
        botTarget.c
      );

      if (result.sunkShipName) {
        sounds.playShipSunk();
        setNotification(`🚨 Aïe ! Votre ${result.sunkShipName} a coulé ! L'Amiral Bot rejoue...`);
      } else if (result.isHit) {
        sounds.playExplosion();
        setNotification("💥 Votre bateau a été touché ! L'Amiral Bot rejoue...");
      } else {
        sounds.playSplash();
        setNotification("💧 Ouf ! Le tir de l'Amiral Bot est tombé à l'eau ! À vous !");
      }

      setGame(result.updatedGame);
      setIsBotThinking(false);
      setTimeout(() => setNotification(null), 2500);

      if (result.isVictory) {
        recordMatchResult(false);
      }
    }, 1100);

    return () => clearTimeout(timer);
  }, [game.currentTurn, game.status, game.mode, game.player1.shotsReceived?.length]);

  // Victory Confetti
  useEffect(() => {
    if (game.status === 'completed' && game.winner) {
      sounds.playWin();
      try {
        confetti({ particleCount: 140, spread: 85, origin: { y: 0.55 } });
      } catch {
        // ignore
      }
    }
  }, [game.status, game.winner]);

  // Handle Fleet Placement Confirmation
  const handleFleetConfirmed = async (ships: PlacedShip[]) => {
    if (game.mode === 'online') {
      const updated = await battleshipService.confirmFleet(game, mySlot, ships);
      setGame(updated);
    } else if (game.mode === 'bot') {
      const updated = await battleshipService.confirmFleet(game, 'player1', ships);
      setGame({ ...updated, status: 'playing' });
    } else {
      // Local 2P
      if (!game.player1.ready) {
        // Player 1 confirmed, now prepare for Player 2
        setGame((prev) => ({
          ...prev,
          player1: { ...prev.player1, ships, ready: true },
        }));
        setLocalPassReveal(false);
      } else {
        // Player 2 confirmed, start match!
        setGame((prev) => ({
          ...prev,
          player2: { ...prev.player2!, ships, ready: true },
          status: 'playing',
        }));
      }
    }
  };

  // Handle Fire on opponent cell
  const handleFire = async (r: number, c: number) => {
    if (!isMyTurn || isBotThinking) return;

    try {
      const result = await battleshipService.fireShot(game, mySlot, r, c);

      if (result.sunkShipName) {
        sounds.playShipSunk();
        setNotification(`🎉 YOUPI ! ${result.sunkShipName} adverse coulé ! Vous rejouez !`);
      } else if (result.isHit) {
        sounds.playExplosion();
        setNotification('💥 BOUM ! Navire touché ! Vous rejouez !');
      } else {
        sounds.playSplash();
        setNotification("💧 Plouf ! Dans l'eau... Au tour de l'adversaire !");
      }

      setGame(result.updatedGame);
      setTimeout(() => setNotification(null), 2500);

      if (result.isVictory) {
        const won = result.updatedGame.winner === mySlot;
        recordMatchResult(won);
      }
    } catch (err) {
      console.error('Erreur lors du tir en ligne:', err);
      setNotification('⚠️ Erreur réseau lors du tir. Réessayez !');
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleRematch = async () => {
    if (!userProfile) return;
    if (game.mode === 'bot') {
      const newG = await battleshipService.createBotGame(userProfile);
      botTurnHandledRef.current = -1;
      setGame(newG);
    } else if (game.mode === 'local') {
      const newG = await battleshipService.createLocalGame(userProfile, game.player2?.name || 'Joueur 2');
      setGame(newG);
    } else {
      const newG = await battleshipService.createOnlineGame(userProfile);
      setGame(newG);
    }
  };

  // 1. WAITING FOR PLAYER 2 (Online)
  if (game.status === 'waiting') {
    return (
      <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-slate-900 border-2 border-sky-500/40 text-center shadow-2xl animate-fade-in">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-cyan-400 p-0.5 mx-auto mb-4 shadow-lg shadow-cyan-500/20 animate-bounce">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-3xl">
            ⚓
          </div>
        </div>
        <h2 className="text-2xl font-black font-display text-white mb-2">
          Salle Navale Noah Games
        </h2>
        <p className="text-sm text-sky-200/80 mb-6">
          Transmets ce code à ton ami pour qu'il te rejoigne sur le terrain 7×9 !
        </p>

        <div className="py-3 px-4 rounded-2xl bg-slate-950 border border-sky-600/60 mb-6 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-black text-sky-300 block">
              Code de Salle :
            </span>
            <span className="text-xl font-mono font-black text-amber-400 tracking-wider">
              {game.roomCode}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold transition-all active:scale-95 shadow"
            title="Copier le code"
          >
            {copiedCode ? <Check className="w-5 h-5 text-emerald-800" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <button
          onClick={onExitGame}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Annuler et quitter le salon
        </button>
      </div>
    );
  }

  // 2. PLACEMENT PHASE
  if (game.status === 'placement') {
    // If local 2P and player 1 is ready, prompt player 2 with concealment
    if (game.mode === 'local' && game.player1.ready && !localPassReveal) {
      return (
        <div className="max-w-md mx-auto my-12 p-8 rounded-3xl bg-slate-900 border-2 border-sky-500/40 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/20 text-blue-400 mx-auto mb-4 flex items-center justify-center text-3xl">
            🙈
          </div>
          <h2 className="text-2xl font-black font-display text-white mb-2">
            Passe l'appareil à {game.player2?.name || 'Joueur 2'}
          </h2>
          <p className="text-sm text-sky-200/80 mb-6">
            Pour garder le secret de tes bateaux, ne regarde pas l'écran !
          </p>
          <button
            onClick={() => setLocalPassReveal(true)}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
          >
            <Eye className="w-5 h-5" />
            <span>Je suis {game.player2?.name || 'Joueur 2'} - Placer mes bateaux</span>
          </button>
        </div>
      );
    }

    const currentPlayerName =
      game.mode === 'local'
        ? !game.player1.ready
          ? game.player1.name
          : game.player2?.name || 'Joueur 2'
        : mySlot === 'player1'
        ? game.player1.name
        : game.player2?.name || 'Joueur 2';

    // Online waiting for opponent placement
    const myPlayerState = mySlot === 'player1' ? game.player1 : game.player2!;
    if (game.mode === 'online' && myPlayerState.ready) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 rounded-3xl bg-slate-900 border-2 border-sky-500/40 text-center shadow-2xl animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 mx-auto mb-4 flex items-center justify-center text-3xl animate-bounce">
            ⛵
          </div>
          <h2 className="text-2xl font-black font-display text-white mb-2">
            Flotte Déployée !
          </h2>
          <p className="text-sm text-sky-200/80 mb-6">
            Tes 5 bateaux sont prêts ! En attente que ton adversaire termine de placer sa flotte...
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-amber-300 font-bold px-3 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Que la bataille commence !</span>
          </div>
        </div>
      );
    }

    return (
      <div className="py-4">
        <BattleshipPlacement
          playerName={currentPlayerName}
          onFleetConfirmed={handleFleetConfirmed}
        />
      </div>
    );
  }

  // 3. BATTLE PHASE
  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-4 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2 mb-3">
        {/* Room / Mode Badge */}
        <div className="flex items-center gap-2 bg-slate-900/90 border border-sky-800/60 rounded-2xl px-3 py-1.5 shadow-sm">
          <span className="text-base">⛵</span>
          <span className="text-xs font-black text-sky-300 uppercase tracking-wider hidden sm:inline">
            Noah Bataille Navale :
          </span>
          <span className="font-mono font-black text-amber-400 text-xs sm:text-sm">
            {game.roomCode}
          </span>
        </div>

        {/* Turn Status Message */}
        <div className="flex-1 max-w-sm mx-2 text-center truncate">
          {notification ? (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-300 animate-bounce">
              {notification}
            </span>
          ) : isBotThinking ? (
            <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black text-cyan-300">
              <Bot className="w-4 h-4 animate-spin" />
              <span>L'Amiral Bot ajuste ses canons...</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isMyTurn ? 'bg-amber-400' : 'bg-slate-500'
                } animate-ping`}
              />
              <span className="text-xs sm:text-sm font-black text-white">
                {isMyTurn ? '🎯 À toi de tirer, Capitaine !' : "L'adversaire vise..."}
              </span>
            </div>
          )}
        </div>

        {/* Exit button */}
        <button
          onClick={onExitGame}
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
          title="Quitter la partie"
        >
          <Flag className="w-4 h-4" />
        </button>
      </div>

      {/* Main Boards */}
      <div className="flex-1 flex flex-col items-center justify-center my-auto">
        <BattleshipBoard
          game={game}
          mySlot={mySlot}
          isMyTurn={isMyTurn}
          onFire={handleFire}
          disabled={isBotThinking}
        />
      </div>

      {/* Victory Modal */}
      {game.status === 'completed' && game.winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border-2 border-amber-400/60 p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-500 to-cyan-400 p-0.5 mx-auto mb-4 shadow-xl shadow-amber-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[22px] flex items-center justify-center text-4xl">
                🏆
              </div>
            </div>

            <h2 className="text-3xl font-black font-display text-white mb-1">
              {game[game.winner]?.name} a Gagné !
            </h2>
            <p className="text-sky-200 text-sm mb-6">
              {game.winner === mySlot
                ? 'Bravo Amiral ! Toute la flotte adverse est au fond de l\'eau !'
                : 'Ta flotte a été coulée ! Prends ta revanche tout de suite !'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={onExitGame}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-colors border border-slate-700 flex items-center justify-center gap-2"
              >
                <Home className="w-4 h-4" />
                <span>Salon des Jeux</span>
              </button>
              <button
                onClick={handleRematch}
                className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-cyan-400 text-slate-950 font-black text-sm shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Revanche Immédiate !</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
