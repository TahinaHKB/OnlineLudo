/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LobbyScreen } from './components/LobbyScreen';
import { GameScreen } from './components/GameScreen';
import { BattleshipScreen } from './components/battleship/BattleshipScreen';
import { MatchHistoryScreen } from './components/MatchHistoryScreen';
import { AuthModal } from './components/AuthModal';
import { IncomingInviteModal } from './components/IncomingInviteModal';
import { ProfileModal } from './components/ProfileModal';
import { GameState, GameInvite } from './types/ludo';
import { BattleshipGame } from './types/battleship';
import { gameService } from './services/gameService';
import { battleshipService } from './services/battleshipService';
import { sounds } from './utils/audio';
import { Gamepad2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const { currentUser, userProfile, loading } = useAuth();
  const [currentTab, setCurrentTab] = useState<'lobby' | 'history' | 'ludo_game' | 'battleship_game'>('lobby');
  const [selectedGameType, setSelectedGameType] = useState<'ludo' | 'battleship'>('ludo');
  
  const [activeLudoGame, setActiveLudoGame] = useState<GameState | null>(null);
  const [activeBattleshipGame, setActiveBattleshipGame] = useState<BattleshipGame | null>(null);

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
        if (invites[0].gameType === 'battleship') {
          sounds.playSonar();
        } else {
          sounds.playTurn();
        }
      } else {
        setActiveInviteModal(null);
      }
    });

    return () => unsub();
  }, [userProfile?.id]);

  const handleStartLudo = (game: GameState) => {
    setActiveLudoGame(game);
    setCurrentTab('ludo_game');
  };

  const handleStartBattleship = (game: BattleshipGame) => {
    setActiveBattleshipGame(game);
    setCurrentTab('battleship_game');
  };

  const handleExitLudo = () => {
    setActiveLudoGame(null);
    setCurrentTab('lobby');
  };

  const handleExitBattleship = () => {
    setActiveBattleshipGame(null);
    setCurrentTab('lobby');
  };

  const handleAcceptInvite = async (invite: GameInvite) => {
    if (!userProfile) return;
    try {
      await gameService.acceptInvite(invite.id);
      setActiveInviteModal(null);

      const isNaval = invite.gameType === 'battleship' || invite.roomCode.startsWith('NAV');
      if (isNaval) {
        const game = await battleshipService.joinGameByCode(userProfile, invite.roomCode);
        handleStartBattleship(game);
      } else {
        const game = await gameService.joinGameByCode(userProfile, invite.roomCode);
        handleStartLudo(game);
      }
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
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 via-amber-500 to-rose-500 p-0.5 shadow-2xl shadow-cyan-500/20 animate-bounce">
          <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
            <Gamepad2 className="w-8 h-8 text-amber-400 animate-pulse" />
          </div>
        </div>
        <p className="text-sm font-semibold tracking-wider font-display text-white">
          Connexion à Noah Games...
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => setCurrentTab(tab)}
        selectedGameType={selectedGameType}
        setSelectedGameType={setSelectedGameType}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        pendingInvitesCount={pendingInvites.length}
        onOpenInvites={() => {
          if (pendingInvites.length > 0) {
            setActiveInviteModal(pendingInvites[0]);
          }
        }}
        onOpenProfile={() => setShowProfileModal(true)}
        hasActiveLudo={activeLudoGame !== null && activeLudoGame.status === 'playing'}
        hasActiveBattleship={activeBattleshipGame !== null && (activeBattleshipGame.status === 'playing' || activeBattleshipGame.status === 'placement')}
        onReturnToLudo={() => setCurrentTab('ludo_game')}
        onReturnToBattleship={() => setCurrentTab('battleship_game')}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {currentTab === 'lobby' && (
          <LobbyScreen
            onStartLudo={handleStartLudo}
            onStartBattleship={handleStartBattleship}
            initialGameTab={selectedGameType}
          />
        )}

        {currentTab === 'history' && (
          <MatchHistoryScreen />
        )}

        {currentTab === 'ludo_game' && activeLudoGame && (
          <GameScreen
            initialGame={activeLudoGame}
            onExitGame={handleExitLudo}
          />
        )}

        {currentTab === 'battleship_game' && activeBattleshipGame && (
          <BattleshipScreen
            initialGame={activeBattleshipGame}
            onExitGame={handleExitBattleship}
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
