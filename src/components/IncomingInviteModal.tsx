import React from 'react';
import { GameInvite } from '../types/ludo';
import { Dices, Check, X } from 'lucide-react';
import { sounds } from '../utils/audio';

interface IncomingInviteModalProps {
  invite: GameInvite | null;
  onAccept: (invite: GameInvite) => void;
  onDecline: (invite: GameInvite) => void;
}

export const IncomingInviteModal: React.FC<IncomingInviteModalProps> = ({
  invite,
  onAccept,
  onDecline,
}) => {
  if (!invite) return null;

  const handleAccept = () => {
    sounds.playTurn();
    onAccept(invite);
  };

  const handleDecline = () => {
    onDecline(invite);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-slate-900 border-2 border-amber-500/40 p-6 shadow-2xl shadow-amber-500/20 text-center relative overflow-hidden">
        {/* Decorative corner accent */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg shadow-amber-500/30 animate-bounce">
          {invite.senderAvatar || '🎲'}
        </div>

        <h3 className="text-xl font-bold font-display text-white mb-1">
          Game Invitation!
        </h3>
        <p className="text-sm text-slate-300 mb-4">
          <strong className="text-amber-400 font-semibold">{invite.senderName}</strong>{' '}
          has invited you to a real-time Ludo duel!
        </p>

        <div className="py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700 mb-6 inline-flex items-center gap-2">
          <Dices className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-slate-400 font-medium">Room Code:</span>
          <span className="text-sm font-mono font-bold text-amber-300 tracking-wider">
            {invite.roomCode}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleDecline}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold text-sm transition-colors border border-slate-700 flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            <span>Decline</span>
          </button>

          <button
            onClick={handleAccept}
            className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
};
