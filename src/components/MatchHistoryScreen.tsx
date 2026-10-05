import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  Flame, 
  Clock, 
  History, 
  RefreshCw, 
  Percent,
  Calendar,
  Award,
  Anchor,
  Dices
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gameService } from '../services/gameService';
import { MatchHistoryRecord } from '../types/ludo';

export const MatchHistoryScreen: React.FC = () => {
  const { userProfile } = useAuth();
  const [matches, setMatches] = useState<MatchHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'ludo' | 'battleship'>('all');

  const fetchMatches = async () => {
    if (!userProfile) return;
    setLoading(true);
    try {
      const data = await gameService.getUserMatches(userProfile.id);
      setMatches(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [userProfile?.id]);

  const filteredMatches = matches.filter((m) => {
    if (filterType === 'all') return true;
    const isNaval = m.gameType === 'battleship' || m.gameId.includes('nav');
    return filterType === 'battleship' ? isNaval : !isNaval;
  });

  const stats = userProfile?.stats || { gamesPlayed: 0, wins: 0, losses: 0, streak: 0 };
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black font-display text-white">
            Historique & Statistiques
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Suivez vos victoires et affrontements sur Ludo et Bataille Navale.
          </p>
        </div>

        <button
          onClick={fetchMatches}
          disabled={loading}
          className="self-start sm:self-center p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
          title="Rafraîchir"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Matches */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Parties Jouées</span>
            <History className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-white">
            {stats.gamesPlayed}
          </div>
        </div>

        {/* Victories */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Victoires</span>
            <Trophy className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-emerald-400">
            {stats.wins}
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Taux Victoire</span>
            <Percent className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-amber-300">
            {winRate}%
          </div>
        </div>

        {/* Win Streak */}
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
            <span>Série en cours</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black font-display text-rose-400">
            {stats.streak} 🔥
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
            filterType === 'all'
              ? 'bg-slate-800 border-slate-700 text-white'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Tous ({matches.length})
        </button>
        <button
          onClick={() => setFilterType('ludo')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
            filterType === 'ludo'
              ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Dices className="w-3.5 h-3.5" />
          <span>Ludo</span>
        </button>
        <button
          onClick={() => setFilterType('battleship')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 ${
            filterType === 'battleship'
              ? 'bg-cyan-500/20 border-cyan-500/60 text-cyan-300'
              : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Anchor className="w-3.5 h-3.5" />
          <span>Bataille Navale</span>
        </button>
      </div>

      {/* Matches List */}
      <div className="rounded-3xl bg-slate-900/90 border border-slate-800 p-4 sm:p-6 shadow-xl">
        <h3 className="text-lg font-bold font-display text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          Matchs Récents
        </h3>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
            <span>Chargement des combats...</span>
          </div>
        ) : filteredMatches.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            <p className="font-semibold text-slate-400 mb-1">Aucun match enregistré pour ce filtre.</p>
            <p className="text-xs">Lancez un duel pour inscrire vos premières victoires !</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredMatches.map((m) => {
              const isP1 = m.player1Uid === userProfile?.id;
              const isWinner = m.winnerUid === userProfile?.id;
              const opponentName = isP1 ? m.player2Name : m.player1Name;
              const isNaval = m.gameType === 'battleship' || m.gameId.includes('nav');

              return (
                <div
                  key={m.id}
                  className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isWinner
                      ? 'bg-emerald-950/20 border-emerald-800/40 hover:border-emerald-700/60'
                      : 'bg-rose-950/20 border-rose-800/40 hover:border-rose-700/60'
                  }`}
                >
                  {/* Left: Outcome & Game & Opponent */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                        isWinner
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {isWinner ? 'VICTOIRE' : 'DÉFAITE'}
                    </span>

                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700">
                          {isNaval ? <Anchor className="w-3 h-3 text-cyan-400" /> : <Dices className="w-3 h-3 text-amber-400" />}
                          <span className={isNaval ? 'text-cyan-300' : 'text-amber-300'}>
                            {isNaval ? 'Bataille Navale' : 'Ludo'}
                          </span>
                        </span>
                        <span>vs {opponentName}</span>
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(m.createdAt)}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(m.durationSeconds)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Score */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <div className="text-right">
                      <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                        {isNaval ? 'Flotte Survivante' : 'Pions au But'}
                      </div>
                      <div className="text-sm font-black font-mono text-white">
                        <span className={isWinner ? 'text-emerald-400' : 'text-slate-300'}>
                          {isP1 ? m.player1TokensFinished : m.player2TokensFinished}
                        </span>
                        <span className="text-slate-500 mx-1">-</span>
                        <span className={!isWinner ? 'text-rose-400' : 'text-slate-300'}>
                          {isP1 ? m.player2TokensFinished : m.player1TokensFinished}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
