import React from 'react';
import { 
   Dices, 
   Anchor, 
   Volume2, 
   VolumeX, 
   History, 
   Users, 
   LogOut, 
   Bell, 
   Sparkles,
   Gamepad2 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/audio';

interface NavbarProps {
  currentTab: 'lobby' | 'history' | 'ludo_game' | 'battleship_game';
  setCurrentTab: (tab: 'lobby' | 'history') => void;
  selectedGameType: 'ludo' | 'battleship';
  setSelectedGameType: (type: 'ludo' | 'battleship') => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  pendingInvitesCount: number;
  onOpenInvites: () => void;
  onOpenProfile: () => void;
  hasActiveLudo: boolean;
  hasActiveBattleship: boolean;
  onReturnToLudo?: () => void;
  onReturnToBattleship?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  selectedGameType,
  setSelectedGameType,
  soundEnabled,
  setSoundEnabled,
  pendingInvitesCount,
  onOpenInvites,
  onOpenProfile,
  hasActiveLudo,
  hasActiveBattleship,
  onReturnToLudo,
  onReturnToBattleship,
}) => {
  const { userProfile, logout } = useAuth();

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playTurn();
  };

  const isInMatch = currentTab === 'ludo_game' || currentTab === 'battleship_game';

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-3 sm:px-4 py-2.5 sm:py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Brand / Platform Name */}
        <div 
          onClick={() => setCurrentTab('lobby')}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-amber-500 to-rose-500 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black text-lg sm:text-xl tracking-tight bg-gradient-to-r from-amber-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
                Noah Games
              </span>
              <span className="text-[10px] px-1.5 py-0.2 font-bold uppercase tracking-wider rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                PLAY
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden sm:block font-medium">
              Ludo & Bataille Navale en Ligne
            </p>
          </div>
        </div>

        {/* Center Navigation & Active Game Quick Link */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {/* If match in progress, quick return button */}
          {hasActiveLudo && onReturnToLudo && currentTab !== 'ludo_game' && (
            <button
              onClick={onReturnToLudo}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-all animate-pulse"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Partie Ludo</span>
            </button>
          )}

          {hasActiveBattleship && onReturnToBattleship && currentTab !== 'battleship_game' && (
            <button
              onClick={onReturnToBattleship}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all animate-pulse"
            >
              <Anchor className="w-3.5 h-3.5" />
              <span>Bataille Navale</span>
            </button>
          )}

          {/* Lobby Tab */}
          <button
            onClick={() => setCurrentTab('lobby')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentTab === 'lobby'
                ? 'bg-slate-800 text-amber-400 font-semibold border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden xs:inline">Jeux & Salon</span>
            <span className="xs:hidden">Salon</span>
          </button>

          {/* Matches Tab */}
          <button
            onClick={() => setCurrentTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentTab === 'history'
                ? 'bg-slate-800 text-amber-400 font-semibold border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden xs:inline">Historique</span>
            <span className="xs:hidden">Matchs</span>
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Invites notification bell */}
          {pendingInvitesCount > 0 && (
            <button
              onClick={onOpenInvites}
              className="relative p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors animate-pulse"
              title={`${pendingInvitesCount} invitation(s) en attente`}
            >
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                {pendingInvitesCount}
              </span>
            </button>
          )}

          {/* Sound Toggle */}
          <button
            onClick={toggleSound}
            aria-label="Toggle Sound"
            className={`p-2 rounded-lg border transition-colors ${
              soundEnabled
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:text-amber-400'
                : 'bg-slate-800/50 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
            title={soundEnabled ? 'Couper le son' : 'Activer le son'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* User Profile Pill */}
          {userProfile && (
            <div 
              onClick={onOpenProfile}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer group"
              title="Profil & Statistiques"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-sm shadow">
                {userProfile.avatar || '🎲'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 max-w-[80px] sm:max-w-[110px] truncate group-hover:text-amber-300 transition-colors">
                  {userProfile.displayName}
                </span>
                <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {userProfile.stats?.wins || 0} Vict.
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
            title="Déconnexion"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
