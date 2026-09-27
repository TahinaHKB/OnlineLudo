import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, X, Check, Trophy, Flame, History, Percent } from 'lucide-react';
import { sounds } from '../utils/audio';

const AVATARS = ['👑', '🦁', '🦊', '🚀', '⚡', '🐉', '🎯', '🔥', '🎲', '⭐', '🐯', '💎'];

interface ProfileModalProps {
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose }) => {
  const { userProfile, updateProfileDetails } = useAuth();
  const [name, setName] = useState(userProfile?.displayName || '');
  const [selectedAvatar, setSelectedAvatar] = useState(userProfile?.avatar || '🎲');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const stats = userProfile?.stats || { gamesPlayed: 0, wins: 0, losses: 0, streak: 0 };
  const winRate = stats.gamesPlayed > 0 ? Math.round((stats.wins / stats.gamesPlayed) * 100) : 0;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await updateProfileDetails(name.trim(), selectedAvatar);
      sounds.playTurn();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold font-display text-white mb-4">
          Player Profile & Stats
        </h3>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-950 border border-slate-800 mb-6 text-center">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Wins</div>
            <div className="text-lg font-black text-emerald-400 font-display flex items-center justify-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              {stats.wins}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Win Rate</div>
            <div className="text-lg font-black text-amber-400 font-display flex items-center justify-center gap-1">
              <Percent className="w-3.5 h-3.5" />
              {winRate}%
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Streak</div>
            <div className="text-lg font-black text-rose-400 font-display flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5" />
              {stats.streak}
            </div>
          </div>
        </div>

        {/* Form: Name & Avatar */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Player Nickname
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              required
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-600 focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Avatar Icon
            </label>
            <div className="grid grid-cols-6 gap-2">
              {AVATARS.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => setSelectedAvatar(av)}
                  className={`h-10 rounded-xl text-lg flex items-center justify-center border transition-all ${
                    selectedAvatar === av
                      ? 'bg-amber-500/20 border-amber-400 scale-105 shadow'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>{saving ? 'Saving...' : 'Save Profile'}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
