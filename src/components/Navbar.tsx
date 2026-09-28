import React from 'react';
import { 
  Dices, 
  Volume2, 
  VolumeX, 
  History, 
  Users, 
  LogOut, 
  User as UserIcon, 
  Bell,
  Sparkles 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../utils/audio';

interface NavbarProps {
  currentTab: 'lobby' | 'history' | 'game';
  setCurrentTab: (tab: 'lobby' | 'history') => void;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  pendingInvitesCount: number;
  onOpenInvites: () => void;
  onOpenProfile: () => void;
  isInActiveGame: boolean;
  onReturnToGame?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  soundEnabled,
  setSoundEnabled,
  pendingInvitesCount,
  onOpenInvites,
  onOpenProfile,
  isInActiveGame,
  onReturnToGame,
}) => {
  const { userProfile, logout } = useAuth();

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playTurn();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* Logo / Brand */}
        <div 
          onClick={() => setCurrentTab('lobby')}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Dices className="w-5 h-5 text-amber-400 group-hover:rotate-12 transition-transform" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-display font-bold text-xl tracking-tight bg-gradient-to-r from-amber-400 via-rose-300 to-emerald-400 bg-clip-text text-transparent">
                Lud‘s Noah
              </span>
              <span className="text-[10px] px-1.5 py-0.5 font-bold uppercase tracking-wider rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                LIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-medium">Real-Time Multiplayer</p>
          </div>
        </div>

        {/* Center Navigation */}
        <nav className="flex items-center gap-1 sm:gap-2">
          {isInActiveGame && onReturnToGame && (
            <button
              onClick={onReturnToGame}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                currentTab === 'game'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/25 ring-2 ring-amber-400/50'
                  : 'bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900/40'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Back to Match</span>
            </button>
          )}

          <button
            onClick={() => setCurrentTab('lobby')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentTab === 'lobby'
                ? 'bg-slate-800 text-amber-400 font-semibold border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Lobby</span>
          </button>

          <button
            onClick={() => setCurrentTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              currentTab === 'history'
                ? 'bg-slate-800 text-amber-400 font-semibold border border-slate-700'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden xs:inline">Matches</span>
          </button>
        </nav>

        {/* Right Actions: Invites, Sound, Profile */}
        <div className="flex items-center gap-2">
          {/* Invites notification bell */}
          {pendingInvitesCount > 0 && (
            <button
              onClick={onOpenInvites}
              className="relative p-2 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition-colors animate-pulse"
              title={`${pendingInvitesCount} pending invites`}
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
            title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* User Profile Pill */}
          {userProfile && (
            <div 
              onClick={onOpenProfile}
              className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 hover:border-slate-600 transition-colors cursor-pointer group"
              title="View Profile & Stats"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-sm shadow">
                {userProfile.avatar || '🎲'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-slate-200 max-w-[85px] sm:max-w-[120px] truncate group-hover:text-amber-300 transition-colors">
                  {userProfile.displayName}
                </span>
                <span className="text-[10px] text-amber-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  {userProfile.stats?.wins || 0} Wins
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={() => logout()}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
