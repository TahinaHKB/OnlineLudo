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
  Search,
  CheckCircle2,
  ShieldCheck,
  Dices
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gameService } from '../services/gameService';
import { GameState, UserProfile } from '../types/ludo';
import { sounds } from '../utils/audio';

interface LobbyScreenProps {
  onStartGame: (game: GameState) => void;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({ onStartGame }) => {
  const { userProfile } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [onlinePlayers, setOnlinePlayers] = useState<UserProfile[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [invitedPlayerId, setInvitedPlayerId] = useState<string | null>(null);
  const [targetTokens, setTargetTokens] = useState<number>(4);

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

  // Create Online Room
  const handleCreateOnline = async () => {
    if (!userProfile) return;
    setLoadingAction('create_online');
    setErrorMessage(null);
    try {
      sounds.playTurn();
      const game = await gameService.createOnlineGame(userProfile, targetTokens);
      onStartGame(game);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to create room');
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
      sounds.playTurn();
      const game = await gameService.joinGameByCode(userProfile, joinCode.trim());
      onStartGame(game);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setLoadingAction(null);
    }
  };

  // Play vs Bot
  const handlePlayBot = async () => {
    if (!userProfile) return;
    setLoadingAction('bot');
    sounds.playTurn();
    try {
      const game = await gameService.createBotGame(userProfile);
      onStartGame(game);
    } finally {
      setLoadingAction(null);
    }
  };

  // Local Pass & Play
  const handlePassAndPlay = async () => {
    if (!userProfile) return;
    setLoadingAction('local');
    sounds.playTurn();
    try {
      const game = await gameService.createLocalGame(userProfile, 'Player 2');
      onStartGame(game);
    } finally {
      setLoadingAction(null);
    }
  };

  // Invite online player
  const handleInvitePlayer = async (targetPlayer: UserProfile) => {
    if (!userProfile) return;
    setInvitedPlayerId(targetPlayer.id);
    sounds.playTurn();
    try {
      const game = await gameService.createOnlineGame(userProfile, targetTokens);
      await gameService.sendGameInvite(userProfile, targetPlayer, game.id, game.roomCode);
      onStartGame(game);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to send invite');
      setInvitedPlayerId(null);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Hero Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-indigo-600/15 border border-slate-800 p-6 sm:p-8 overflow-hidden shadow-xl">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Live 2-Player Ludo
          </div>
          <h1 className="text-3xl sm:text-5xl font-black font-display text-white tracking-tight leading-tight mb-2">
            Roll, Capture, <span className="text-amber-400">Dominate.</span>
          </h1>
          <p className="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
            Challenge players online in real time, invite friends directly, or practice against our smart bot. Enjoy classic rules with safe zones and instant turns!
          </p>

          {/* Quick Stats Pill if logged in */}
          {userProfile && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700/80 text-xs font-semibold text-slate-300 flex items-center gap-2">
                <span>Total Matches:</span>
                <span className="font-bold text-white font-mono">{userProfile.stats?.gamesPlayed || 0}</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-700/50 text-xs font-semibold text-emerald-300 flex items-center gap-2">
                <span>Wins:</span>
                <span className="font-bold text-emerald-400 font-mono">{userProfile.stats?.wins || 0}</span>
              </div>
              <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-700/50 text-xs font-semibold text-amber-300 flex items-center gap-2">
                <span>Streak:</span>
                <span className="font-bold text-amber-400 font-mono">{userProfile.stats?.streak || 0} 🔥</span>
              </div>
            </div>
          )}
        </div>

        {/* Decorative background dice */}
        <div className="absolute -right-8 -bottom-8 opacity-15 pointer-events-none transform rotate-12">
          <Dices className="w-64 h-64 text-amber-300" />
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-sm font-medium flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* Primary Game Mode Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {/* Create Online Duel */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between hover:border-amber-500/40 transition-colors shadow-lg">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <Swords className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-display text-white mb-1">
              Create Online Duel
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Host a new game room with a unique room code. Invite a friend or wait for another player to join.
            </p>

            {/* Target tokens toggle */}
            <div className="mb-4">
              <span className="text-xs font-semibold text-slate-400 block mb-1.5">Game Length:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTargetTokens(4)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    targetTokens === 4
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Standard (4 Tokens)
                </button>
                <button
                  type="button"
                  onClick={() => setTargetTokens(2)}
                  className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all border ${
                    targetTokens === 2
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Quick (2 Tokens)
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateOnline}
            disabled={loadingAction !== null}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-sm shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loadingAction === 'create_online' ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>Create Match Room</span>
              </>
            )}
          </button>
        </div>

        {/* Join Room by Code */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex flex-col justify-between hover:border-indigo-500/40 transition-colors shadow-lg">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4">
              <Share2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold font-display text-white mb-1">
              Join with Code
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 mb-4">
              Enter the 6-character room code shared by your friend to jump straight into their board.
            </p>
          </div>

          <form onSubmit={handleJoinByCode} className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. LUDO24"
              maxLength={8}
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
                  <span>Join Match</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Pass & Play (Local 2-Player) */}
        <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 flex items-center justify-between hover:border-emerald-500/40 transition-colors shadow-lg">
          <div className="max-w-[70%]">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold font-display text-white">
                Pass & Play (Local 2P)
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Share the screen and take turns with a friend next to you on this device.
            </p>
          </div>

          <button
            onClick={handlePassAndPlay}
            disabled={loadingAction !== null}
            className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            Start Local
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
                Practice vs Bot
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Hone your tactics against a smart automated opponent. Zero wait time!
            </p>
          </div>

          <button
            onClick={handlePlayBot}
            disabled={loadingAction !== null}
            className="py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 whitespace-nowrap"
          >
            Play Bot
          </button>
        </div>
      </div>

      {/* Online Players & Direct Invites */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h3 className="text-lg font-bold font-display text-white">
              Online Players
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {onlinePlayers.length} online
            </span>
          </div>

          <button
            onClick={loadPlayers}
            disabled={loadingPlayers}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Refresh Online Players"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPlayers ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {onlinePlayers.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">
            <p>No other players online right now.</p>
            <p className="text-xs mt-1 text-slate-600">
              Share your room code with a friend or challenge the AI Bot!
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
                      {player.stats?.wins || 0} Wins
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleInvitePlayer(player)}
                  disabled={invitedPlayerId === player.id}
                  className="py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all active:scale-95 flex items-center gap-1 disabled:opacity-50"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>{invitedPlayerId === player.id ? 'Inviting...' : 'Invite'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rules & Game Guide */}
      <div className="rounded-3xl bg-slate-900/60 border border-slate-800/60 p-6">
        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          Classic Ludo Rules at a Glance
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <span className="font-bold text-amber-400 block mb-1">1. Rolling a 6</span>
            Roll a 6 to bring a token out of your yard onto the start square, plus receive an extra roll!
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <span className="font-bold text-rose-400 block mb-1">2. Captures</span>
            Landing on an opponent's token sends it back to their yard and earns you an immediate bonus turn.
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <span className="font-bold text-emerald-400 block mb-1">3. Safe Star Cells</span>
            Squares with a star ★ and player starting squares are safe zones where tokens cannot be captured.
          </div>
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
            <span className="font-bold text-indigo-400 block mb-1">4. Home Goal</span>
            Navigate around the perimeter and up your home column. First to get all tokens into Home wins!
          </div>
        </div>
      </div>
    </div>
  );
};
