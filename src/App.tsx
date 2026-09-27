/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LobbyScreen } from './components/LobbyScreen';
import { GameScreen } from './components/GameScreen';
import { MatchHistoryScreen } from './components/MatchHistoryScreen';
import { AuthModal } from './components/AuthModal';
import { IncomingInviteModal } from './components/IncomingInviteModal';
import { ProfileModal } from './components/ProfileModal';
import { GameState, GameInvite } from './types/ludo';
import { gameService } from './services/gameService';
import { sounds } from './utils/audio';
import { Dices } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'lobby' | 'history' | 'game'>('lobby');
  const [activeGame, setActiveGame] = useState<GameState | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);
  const [activeInviteModal, setActiveInviteModal] = useState<GameInvite | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Subscribe to real-time incoming game invites
  useEffect(() => {
    if (!userProfile) return;

    const unsub = gameService.subscribeToIncomingInvites(userProfile.id, (invites) => {
      setPendingInvites(invites);
      if (invites.length > 0) {
        setActiveInviteModal(invites[0]);
        sounds.playTurn();
      } else {
        setActiveInviteModal(null);
      }
    });

    return () => unsub();
  }, [userProfile?.id]);

  const handleStartGame = (game: GameState) => {
    setActiveGame(game);
    setCurrentTab('game');
  };

  const handleExitGame = () => {
    setActiveGame(null);
    setCurrentTab('lobby');
  };

  const handleAcceptInvite = async (invite: GameInvite) => {
    if (!userProfile) return;
    try {
      await gameService.acceptInvite(invite.id);
      const game = await gameService.joinGameByCode(userProfile, invite.roomCode);
      setActiveInviteModal(null);
      handleStartGame(game);
    } catch (err) {
      console.error('Failed to accept invite:', err);
      setActiveInviteModal(null);
    }
  };

  const handleDeclineInvite = async (invite: GameInvite) => {
    try {
      await gameService.declineInvite(invite.id);
      setActiveInviteModal(null);
    } catch (err) {
      console.error('Failed to decline invite:', err);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 p-0.5 shadow-2xl shadow-amber-500/20 animate-bounce">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Dices className="w-8 h-8 text-amber-400 animate-spin" />
          </div>
        </div>
        <p className="text-sm font-semibold tracking-wider font-display text-white">
          Entering Ludo Arena...
        </p>
      </div>
    );
  }

  // Not logged in -> Show Auth modal
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 relative overflow-hidden flex flex-col justify-between">
        <AuthModal />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => setCurrentTab(tab)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        pendingInvitesCount={pendingInvites.length}
        onOpenInvites={() => {
          if (pendingInvites.length > 0) {
            setActiveInviteModal(pendingInvites[0]);
          }
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        isInActiveGame={activeGame !== null && activeGame.status === 'playing'}
        onReturnToGame={() => setCurrentTab('game')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'lobby' && (
          <LobbyScreen onStartGame={handleStartGame} />
        )}

        {currentTab === 'history' && (
          <MatchHistoryScreen />
        )}

        {currentTab === 'game' && activeGame && (
          <GameScreen
            initialGame={activeGame}
            onExitGame={handleExitGame}
          />
        )}
      </main>

      {/* Incoming Invite Notification Modal */}
      <IncomingInviteModal
        invite={activeInviteModal}
        onAccept={handleAcceptInvite}
        onDecline={handleDeclineInvite}
      />

      {/* Profile & Settings Modal */}
      {showProfileModal && (
        <ProfileModal onClose={() => setShowProfileModal(false)} />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
