import React from 'react';
import { GameInvite } from '../types/ludo';
import { Dices, Anchor, Check, X } from 'lucide-react';
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

  const isNaval = invite.gameType === 'battleship' || invite.roomCode.startsWith('NAV');

  const handleAccept = () => {
    if (isNaval) sounds.playSonar();
    else sounds.playTurn();
    onAccept(invite);
  };

  const handleDecline = () => {
    onDecline(invite);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div
        className={`w-full max-w-sm rounded-3xl bg-slate-900 border-2 p-6 shadow-2xl text-center relative overflow-hidden ${
          isNaval
            ? 'border-cyan-500/50 shadow-cyan-500/20'
            : 'border-amber-500/40 shadow-amber-500/20'
        }`}
      >
        {/* Decorative corner accent */}
        <div
          className={`absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl pointer-events-none ${
            isNaval ? 'bg-cyan-500/15' : 'bg-amber-500/10'
          }`}
        />

        {/* Header Icon */}
        <div
          className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-lg animate-bounce ${
            isNaval
              ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/30'
              : 'bg-gradient-to-tr from-amber-500 to-rose-500 shadow-amber-500/30'
          }`}
        >
          {invite.senderAvatar || (isNaval ? '⚓' : '🎲')}
        </div>

        <h3 className="text-xl font-bold font-display text-white mb-1">
          {isNaval ? 'Défi Bataille Navale !' : 'Défi Ludo Arena !'}
        </h3>
        <p className="text-sm text-slate-300 mb-4">
          <strong
            className={`font-semibold ${
              isNaval ? 'text-cyan-400' : 'text-amber-400'
            }`}
          >
            {invite.senderName}
          </strong>{' '}
          vous défie sur {isNaval ? 'une grille navale 7×9' : 'le plateau de Ludo'} !
        </p>

        <div className="py-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700 mb-6 inline-flex items-center gap-2">
          {isNaval ? (
            <Anchor className="w-4 h-4 text-cyan-400" />
          ) : (
            <Dices className="w-4 h-4 text-amber-400" />
          )}
          <span className="text-xs text-slate-400 font-medium">Code :</span>
          <span
            className={`text-sm font-mono font-bold tracking-wider ${
              isNaval ? 'text-cyan-300' : 'text-amber-300'
            }`}
          >
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
            <span>Refuser</span>
          </button>

          <button
            onClick={handleAccept}
            className={`flex-1 py-2.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
              isNaval
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-cyan-600/30 text-slate-950'
                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-emerald-600/30'
            }`}
          >
            <Check className="w-4 h-4" />
            <span>Accepter & Jouer</span>
          </button>
        </div>
      </div>
    </div>
  );
};

