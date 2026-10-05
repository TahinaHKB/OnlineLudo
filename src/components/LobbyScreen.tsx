import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Gamepad2, 
  Bot, 
  Swords, 
  Sparkles, 
  Plus, 
  ArrowRight, 
  Share2, 
  RefreshCw, 
  ShieldCheck, 
  Dices,
  Anchor,
  Crosshair,
  Flame,
  Droplet
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gameService } from '../services/gameService';
import { battleshipService } from '../services/battleshipService';
import { GameState, UserProfile } from '../types/ludo';
import { BattleshipGame } from '../types/battleship';
import { sounds } from '../utils/audio';

interface LobbyScreenProps {
  onStartLudo: (game: GameState) => void;
  onStartBattleship: (game: BattleshipGame) => void;
  initialGameTab?: 'ludo' | 'battleship';
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  onStartLudo,
  onStartBattleship,
  initialGameTab = 'ludo',
}) => {
  const { userProfile } = useAuth();
  const [selectedGame, setSelectedGame] = useState<'ludo' | 'battleship'>(initialGameTab);
  const [joinCode, setJoinCode] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<UserProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [invitedPlayerId, setInvitedPlayerId] = useState<string | null>(null);
  const [ludoTokensCount, setLudoTokensCount] = useState<number>(4);

  // Fetch online players
  const loadPlayers = async () => {
    if (!userProfile) return;
    setLoadingPlayers(true);
    try {
      const players = await gameService.getOnlinePlayers(userProfile.id);
      setOnlinePlayers(players);
    } catch {
      // ignore
    } finally {
      setLoadingPlayers(false);
    }
  };

  useEffect(() => {
    loadPlayers();
    const interval = setInterval(loadPlayers, 12000);
    return () => clearInterval(interval);
  }, [userProfile?.id]);

  // Create Online Game
  const handleCreateOnline = async () => {
    if (!userProfile) return;
    setLoadingAction('create_online');
    setErrorMessage(null);
    try {
      if (selectedGame === 'ludo') {
        sounds.playTurn();
        const game = await gameService.createOnlineGame(userProfile, ludoTokensCount);
        onStartLudo(game);
      } else {
        sounds.playSonar();
        const game = await battleshipService.createOnlineGame(userProfile);
        onStartBattleship(game);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Échec de création');
    } finally {
      setLoadingAction(null);
    }
  };

  // Join by code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !joinCode.trim()) return;
    setLoadingAction('join');
    setErrorMessage(null);
    try {
      const code = joinCode.trim().toUpperCase();
      if (code.startsWith('NAV')) {
        sounds.playSonar();
        const game = await battleshipService.joinGameByCode(userProfile, code);
        onStartBattleship(game);
      } else {
        sounds.playTurn();
        try {
          const game = await gameService.joinGameByCode(userProfile, code);
          onStartLudo(game);
        } catch (ludoErr) {
          // If room not found in ludo, also try naval
          const navGame = await battleshipService.joinGameByCode(userProfile, code);
          onStartBattleship(navGame);
        }
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Salle introuvable');
    } finally {
      setLoadingAction(null);
    }
  };

  // Play vs Bot
  const handlePlayBot = async () => {
    if (!userProfile) return;
    setLoadingAction('bot');
    try {
      if (selectedGame === 'ludo') {
        sounds.playTurn();
        const game = await gameService.createBotGame(userProfile);
        onStartLudo(game);
      } else {
        sounds.playSonar();
        const game = await battleshipService.createBotGame(userProfile);
        onStartBattleship(game);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // Local Pass & Play
  const handlePassAndPlay = async () => {
    if (!userProfile) return;
    setLoadingAction('local');
    try {
      if (selectedGame === 'ludo') {
        sounds.playTurn();
        const game = await gameService.createLocalGame(userProfile, 'Joueur 2');
        onStartLudo(game);
      } else {
        sounds.playSonar();
        const game = await battleshipService.createLocalGame(userProfile, 'Joueur 2');
        onStartBattleship(game);
      }
    } finally {
      setLoadingAction(null);
    }
  };

  // Invite online player
  const handleInvitePlayer = async (targetPlayer: UserProfile, gameType: 'ludo' | 'battleship') => {
    if (!userProfile) return;
    setInvitedPlayerId(`${targetPlayer.id}_${gameType}`);
    try {
      if (gameType === 'ludo') {
        sounds.playTurn();
        const game = await gameService.createOnlineGame(userProfile, ludoTokensCount);
        await gameService.sendGameInvite(userProfile, targetPlayer, game.id, game.roomCode);
        onStartLudo(game);
      } else {
        sounds.playSonar();
        const game = await battleshipService.createOnlineGame(userProfile);
        const { db, doc, collection, setDoc } = await import('../firebase');
        const inviteId = doc(collection(db, 'invites')).id;
        await setDoc(doc(db, 'invites', inviteId), {
          id: inviteId,
          senderUid: userProfile.id,
          senderName: userProfile.displayName,
          senderAvatar: userProfile.avatar,
          recipientUid: targetPlayer.id,
          recipientName: targetPlayer.displayName,
          gameId: game.id,
          roomCode: game.roomCode,
          gameType: 'battleship',
          status: 'pending',
          createdAt: Date.now(),
        });
        onStartBattleship(game);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Échec de l'invitation");
      setInvitedPlayerId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Platform Game Hub Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Game 1: Ludo */}
        <div
          onClick={() => {
            setSelectedGame('ludo');
            sounds.playTurn();
          }}
          className={`p-4 sm:p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${
            selectedGame === 'ludo'
              ? 'bg-gradient-to-br from-amber-500/20 via-rose-500/15 to-slate-900 border-amber-500/80 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
              🎲
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                selectedGame === 'ludo'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {selectedGame === 'ludo' ? 'Sélectionné' : 'Jouer'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-display text-white mb-1">
            Ludo Arena
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Plateau 15×15, dés 3D, captures enragées et zones étoiles sécurisées. Animation de saut et déplacement automatique d'un coup unique !
          </p>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-400">
            <span>2 Joueurs</span>
            <span>•</span>
            <span>Animation fluide</span>
            <span>•</span>
            <span>Coup auto</span>
          </div>
        </div>

        {/* Game 2: Bataille Navale */}
        <div
          onClick={() => {
            setSelectedGame('battleship');
            sounds.playSonar();
          }}
          className={`p-4 sm:p-5 rounded-3xl border-2 cursor-pointer transition-all duration-300 relative overflow-hidden group ${
            selectedGame === 'battleship'
              ? 'bg-gradient-to-br from-cyan-500/20 via-blue-600/15 to-slate-900 border-cyan-400/80 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/30'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-80'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-2xl shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
              ⚓
            </div>
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                selectedGame === 'battleship'
                  ? 'bg-cyan-400 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {selectedGame === 'battleship' ? 'Sélectionné' : 'Jouer'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black font-display text-white mb-1">
            Bataille Navale (7×9)
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Grille de 7×9 carreaux. Déployez secrètement vos 5 navires (2, 3, 3, 4 et 5 carreaux), visez au radar et coulez la flotte ennemie !
          </p>

          <div className="flex items-center gap-2 text-[11px] font-semibold text-cyan-400">
            <span>Terrain 7×9</span>
            <span>•</span>
            <span>5 Navires</span>
            <span>•</span>
            <span>Brouillard secret</span>
          </div>
        </div>
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-medium flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Action Modes Grid for Selected Game */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Create Online Room */}
        <div
          className={`rounded-3xl bg-slate-900/90 border p-6 flex flex-col justify-between shadow-lg transition-colors ${
            selectedGame === 'ludo'
              ? 'border-slate-800 hover:border-amber-500/40'
              : 'border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <div>
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
                selectedGame === 'ludo'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-cyan-500/20 text-cyan-400'
              }`}
            >
              <Swords className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-display text-white mb-1">
              Créer un Duel en Ligne ({selectedGame === 'ludo' ? 'Ludo' : 'Naval'})
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              {selectedGame === 'ludo'
                ? 'Hébergez une partie de Ludo avec un code de salle pour inviter un ami ou défier en ligne.'
                : 'Créez une salle navale 7×9. Chaque joueur place secrètement ses 5 navires avant de faire feu.'}
            </p>

            {/* If Ludo: Target tokens toggle */}
            {selectedGame === 'ludo' && (
              <div className="mb-4">
                <span className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Longueur de la partie :
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLudoTokensCount(4)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      ludoTokensCount === 4
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Classique (4 pions)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLudoTokensCount(2)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                      ludoTokensCount === 2
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Rapide (2 pions)
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCreateOnline}
            disabled={loadingAction !== null}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 ${
              selectedGame === 'ludo'
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white shadow-amber-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25 font-black'
            }`}
          >
            {loadingAction === 'create_online' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>
                  {selectedGame === 'ludo'
                    ? 'Créer une Salle Ludo'
                    : 'Créer une Salle Navale 7×9'}
                </span>
              </>
            )}
          </button>
        </div>

        {/* Join by Code */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-colors shadow-lg">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-display text-white mb-1">
              Rejoindre avec un Code
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Entrez le code de salle (ex. LUDO... ou NAV-...) partagé par votre ami pour rejoindre instantanément son terrain.
            </p>
          </div>

          <form onSubmit={handleJoinByCode} className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={selectedGame === 'ludo' ? 'Ex: LUDO24' : 'Ex: NAV-8K29'}
              maxLength={12}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-center font-mono font-bold tracking-widest text-white placeholder-slate-600 uppercase focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={loadingAction !== null || !joinCode.trim()}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {loadingAction === 'join' ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>Rejoindre la Partie</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pass & Play (Local 2P) */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex items-center justify-between hover:border-emerald-500/40 transition-colors shadow-lg">
          <div className="max-w-[70%]">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white">
                Pass & Play (Local 2J)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {selectedGame === 'ludo'
                ? 'Jouez à deux sur le même écran à tour de rôle avec les dés.'
                : 'Passez le téléphone/ordinateur entre les tours en préservant le secret de vos bateaux !'}
            </p>
          </div>

          <button
            onClick={handlePassAndPlay}
            disabled={loadingAction !== null}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            Lancer Local
          </button>
        </div>

        {/* Play vs AI Bot */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex items-center justify-between hover:border-rose-500/40 transition-colors shadow-lg">
          <div className="max-w-[70%]">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white">
                Pratique vs Bot IA
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              {selectedGame === 'ludo'
                ? "Affrontez notre bot intelligent avec l'exécution auto des coups uniques."
                : "Combattez l'Amiral Bot et son algorithme de recherche & destruction radar !"}
            </p>
          </div>

          <button
            onClick={handlePlayBot}
            disabled={loadingAction !== null}
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            Jouer Bot
          </button>
        </div>
      </div>

      {/* Online Players with Direct Dual-Game Invitations */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-lg font-bold font-display text-white">
              Joueurs en Ligne
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {onlinePlayers.length} en ligne
            </span>
          </div>

          <button
            onClick={loadPlayers}
            disabled={loadingPlayers}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Rafraîchir les joueurs en ligne"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPlayers ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {onlinePlayers.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            <p>Aucun autre joueur en ligne actuellement.</p>
            <p className="text-xs mt-1 text-slate-600">
              Partagez votre code de salle ou entraînez-vous contre l'IA Bot !
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {onlinePlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-base shadow">
                    {player.avatar || '🎲'}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-white truncate block">
                      {player.displayName}
                    </span>
                    <span className="text-[10px] text-amber-400 font-medium">
                      {player.stats?.wins || 0} Victoires
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleInvitePlayer(player, 'ludo')}
                    disabled={invitedPlayerId === `${player.id}_ludo`}
                    className="py-1 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    title="Inviter sur Ludo"
                  >
                    🎲 Ludo
                  </button>
                  <button
                    onClick={() => handleInvitePlayer(player, 'battleship')}
                    disabled={invitedPlayerId === `${player.id}_battleship`}
                    className="py-1 px-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
                    title="Inviter sur Bataille Navale"
                  >
                    ⚓ Navale
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules Guide for both games */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/60 p-6 space-y-6">
        <div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-cyan-400 mb-3 flex items-center gap-1.5">
            <Anchor className="w-4 h-4" />
            Règles Bataille Navale (Terrain 7×9 & 5 Navires)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-cyan-400 block mb-1">1. Terrain 7×9</span>
              La zone d'engagement comporte 7 colonnes (1-7) et 9 rangées (A-I), soit 63 carreaux de haute tension.
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-cyan-400 block mb-1">2. 5 Navires secrets</span>
              1 de 2 carreaux, 2 de 3 carreaux, 1 de 4 carreaux et 1 de 5 carreaux. Placés secrètement sans se faire repérer !
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-cyan-400 block mb-1">3. Touché = Rejouez !</span>
              Chaque fois que vous touchez un navire, vous rejouez immédiatement ! C'est uniquement lorsque le tir tombe à l'eau que le tour passe à l'adversaire.
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-cyan-400 block mb-1">4. Victoire Navale</span>
              Le premier capitaine à couler l'intégralité des 5 navires de sa cible remporte la bataille !
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/60">
          <h4 className="text-sm font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
            <Dices className="w-4 h-4" />
            Règles Ludo Arena & Nouveautés
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-300">
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-amber-400 block mb-1">Faire 6</span>
              Un 6 libère un pion de la base sur le départ et offre immédiatement un lancer supplémentaire.
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-rose-400 block mb-1">Captures & Étoiles</span>
              Atterrir sur un pion adverse le renvoie à sa base. Les cases étoilées ★ sont des zones protégées.
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-emerald-400 block mb-1">Animation de Saut</span>
              Les pions glissent et bondissent dynamiquement lors de chaque déplacement avec effet sonore.
            </div>
            <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <span className="font-bold text-indigo-400 block mb-1">Coup Unique Auto</span>
              Si un seul coup légal est possible avec votre dé, il s'exécute automatiquement sans clic forcé !
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
