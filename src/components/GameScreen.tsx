import React, { useState, useEffect, useRef, useTransition } from 'react';
import { 
  GameState, 
  PlayerSlot, 
  PlayerColor 
} from '../types/ludo';
import { useAuth } from '../context/AuthContext';
import { gameService } from '../services/gameService';
import { LudoBoard } from './LudoBoard';
import { Dice } from './Dice';
import { VictoryModal } from './VictoryModal';
import { chooseBotMove, getValidMoves, applyTokenMove } from '../utils/gameRules';
import { sounds } from '../utils/audio';
import { 
  Copy, 
  Check, 
  Flag, 
  MessageSquare, 
  Clock, 
  Users, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Send
} from 'lucide-react';

interface GameScreenProps {
  initialGame: GameState;
  onExitGame: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
  initialGame,
  onExitGame,
}) => {
  const { userProfile, recordMatchResult } = useAuth();
  const [game, setGame] = useState<GameState>(initialGame);
  const [isRolling, setIsRolling] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showSurrenderConfirm, setShowSurrenderConfirm] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const [, startTransition] = useTransition();

  const prevTurnRef = useRef<PlayerSlot>(game.currentTurn);
  const prevLastMoveRef = useRef<number>(game.lastMove?.timestamp || 0);

  // Determine user's slot in the game
  const mySlot: PlayerSlot | null = (() => {
    if (!userProfile) return null;
    if (game.mode === 'local') {
      return game.currentTurn; // Local player controls the active slot!
    }
    if (game.player1.uid === userProfile.id) return 'player1';
    if (game.player2 && game.player2.uid === userProfile.id) return 'player2';
    return null;
  })();

  const isMyTurn = mySlot !== null && game.currentTurn === mySlot && game.status === 'playing';
  const canRollDice = isMyTurn && !game.diceRolled && !isRolling;
  const isAutoMoving = isMyTurn && game.diceRolled && game.validMoves.length === 1;

  // Auto-execute if only one valid move exists ("si un seul coup est valable, il s'exécute automatiquement")
  useEffect(() => {
    if (!isMyTurn || !game.diceRolled || game.diceValue === null || isRolling) return;
    if (game.validMoves.length === 1) {
      const onlyMoveIndex = game.validMoves[0];
      const timer = setTimeout(() => {
        handleTokenClick(onlyMoveIndex);
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [game.diceRolled, game.diceValue, game.validMoves, isMyTurn, isRolling]);

  // Real-time Firestore subscription (if online mode)
  useEffect(() => {
    if (game.mode !== 'online') return;

    const unsub = gameService.subscribeToGame(game.id, (updatedGame) => {
      startTransition(() => {
        setGame(updatedGame);
      });

      // Sound notification if turn switched to user
      if (
        updatedGame.status === 'playing' &&
        updatedGame.currentTurn !== prevTurnRef.current
      ) {
        prevTurnRef.current = updatedGame.currentTurn;
        if (
          (updatedGame.currentTurn === 'player1' && updatedGame.player1.uid === userProfile?.id) ||
          (updatedGame.currentTurn === 'player2' && updatedGame.player2?.uid === userProfile?.id)
        ) {
          sounds.playTurn();
        }
      }

      // Check if move was made
      if (
        updatedGame.lastMove &&
        updatedGame.lastMove.timestamp !== prevLastMoveRef.current
      ) {
        prevLastMoveRef.current = updatedGame.lastMove.timestamp;
        if (updatedGame.lastMove.captured) {
          sounds.playCapture();
        } else if (updatedGame.lastMove.toStep === 56) {
          sounds.playHome();
        }
      }
    });

    return () => unsub();
  }, [game.id, game.mode, userProfile?.id]);

  // Turn timer countdown
  useEffect(() => {
    if (game.status !== 'playing') return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((game.turnDeadline - Date.now()) / 1000));
      setSecondsRemaining(remaining);

      // Auto-turn expiration handling for online match
      if (remaining <= 0 && isMyTurn && game.mode === 'online') {
        if (!game.diceRolled) {
          // Auto roll
          handleRoll();
        } else if (game.validMoves.length > 0) {
          // Auto pick first valid move
          handleTokenClick(game.validMoves[0]);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [game.turnDeadline, game.status, isMyTurn, game.diceRolled, game.validMoves]);

  // AI Bot automated actions
  useEffect(() => {
    if (game.mode !== 'bot' || game.status !== 'playing') return;
    if (game.currentTurn !== 'player2') return;

    // 1. Bot needs to roll dice
    if (!game.diceRolled && !isRolling) {
      const timer = setTimeout(() => {
        setIsRolling(true);
        sounds.playRoll();

        setTimeout(() => {
          setIsRolling(false);
          const rollVal = Math.floor(Math.random() * 6) + 1;
          const botTokens = game.tokens.player2;
          const valid = getValidMoves(botTokens, rollVal);

          if (valid.length === 0) {
            // Turn passed to player1
            const opponentSlot: PlayerSlot = 'player1';
            setGame((prev) => ({
              ...prev,
              diceValue: rollVal,
              diceRolled: true,
              validMoves: [],
            }));

            setTimeout(() => {
              setGame((prev) => ({
                ...prev,
                currentTurn: opponentSlot,
                diceValue: null,
                diceRolled: false,
                validMoves: [],
                turnDeadline: Date.now() + 30000,
              }));
              sounds.playTurn();
            }, 1000);
          } else {
            setGame((prev) => ({
              ...prev,
              diceValue: rollVal,
              diceRolled: true,
              validMoves: valid,
            }));
          }
        }, 500);
      }, 700);

      return () => clearTimeout(timer);
    }

    // 2. Bot rolled and needs to make a move
    if (game.diceRolled && game.diceValue !== null && game.validMoves.length > 0) {
      const timer = setTimeout(() => {
        const botTokens = game.tokens.player2;
        const opponentTokens = game.tokens.player1;
        const chosenIndex = chooseBotMove(
          botTokens,
          game.validMoves,
          game.player2!.color,
          game.player1.color,
          opponentTokens,
          game.diceValue!
        );

        if (chosenIndex !== -1) {
          const { updatedGameState, captured, reachedHome } = applyTokenMove(
            game,
            'player2',
            chosenIndex,
            game.diceValue!
          );

          if (captured) sounds.playCapture();
          else if (reachedHome) sounds.playHome();
          else sounds.playMove();

          setGame(updatedGameState);
        }
      }, 900);

      return () => clearTimeout(timer);
    }
  }, [game, isRolling]);

  // Handle human roll
  const handleRoll = async () => {
    if (!canRollDice || !mySlot) return;
    setIsRolling(true);

    try {
      if (game.mode === 'online') {
        await gameService.rollDice(game, mySlot);
      } else {
        // Local / Bot mode
        const rollVal = Math.floor(Math.random() * 6) + 1;
        const currentTokens = game.tokens[mySlot];
        const valid = getValidMoves(currentTokens, rollVal);

        setGame((prev) => ({
          ...prev,
          diceValue: rollVal,
          diceRolled: true,
          validMoves: valid,
        }));

        if (valid.length === 0) {
          const oppSlot: PlayerSlot = mySlot === 'player1' ? 'player2' : 'player1';
          setTimeout(() => {
            setGame((prev) => ({
              ...prev,
              currentTurn: oppSlot,
              diceValue: null,
              diceRolled: false,
              validMoves: [],
              turnDeadline: Date.now() + 30000,
            }));
          }, 1100);
        }
      }
    } finally {
      setTimeout(() => {
        setIsRolling(false);
      }, 400);
    }
  };

  // Handle token click
  const handleTokenClick = async (tokenIndex: number) => {
    if (!mySlot || !game.diceRolled || game.diceValue === null) return;
    if (!game.validMoves.includes(tokenIndex)) return;

    if (game.mode === 'online') {
      await gameService.moveToken(game, mySlot, tokenIndex);
    } else {
      const { updatedGameState, captured, reachedHome } = applyTokenMove(
        game,
        mySlot,
        tokenIndex,
        game.diceValue
      );

      if (captured) sounds.playCapture();
      else if (reachedHome) sounds.playHome();
      else sounds.playMove();

      setGame(updatedGameState);

      if (updatedGameState.status === 'completed' && updatedGameState.winner) {
        const won = updatedGameState.winner === 'player1';
        recordMatchResult(won);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(game.roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleSurrender = async () => {
    if (!mySlot) return;
    if (game.mode === 'online') {
      await gameService.surrenderGame(game, mySlot);
    } else {
      const winnerSlot: PlayerSlot = mySlot === 'player1' ? 'player2' : 'player1';
      setGame((prev) => ({
        ...prev,
        status: 'completed',
        winner: winnerSlot,
      }));
    }
    setShowSurrenderConfirm(false);
  };

  const handleSendReaction = async (reaction: string) => {
    if (!mySlot || !userProfile) return;
    if (game.mode === 'online') {
      await gameService.sendMessage(game.id, userProfile.id, userProfile.displayName, mySlot, reaction, true);
    } else {
      const newMsg = {
        id: `msg_${Date.now()}`,
        senderUid: userProfile.id,
        senderName: userProfile.displayName,
        senderSlot: mySlot,
        text: reaction,
        isReaction: true,
        timestamp: Date.now(),
      };
      setGame((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), newMsg].slice(-30),
      }));
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !mySlot || !userProfile) return;
    const text = chatInput.trim();
    setChatInput('');

    if (game.mode === 'online') {
      await gameService.sendMessage(game.id, userProfile.id, userProfile.displayName, mySlot, text, false);
    } else {
      const newMsg = {
        id: `msg_${Date.now()}`,
        senderUid: userProfile.id,
        senderName: userProfile.displayName,
        senderSlot: mySlot,
        text,
        isReaction: false,
        timestamp: Date.now(),
      };
      setGame((prev) => ({
        ...prev,
        messages: [...(prev.messages || []), newMsg].slice(-30),
      }));
    }
  };

  const handleRematch = async () => {
    if (!userProfile) return;
    if (game.mode === 'bot') {
      const newG = await gameService.createBotGame(userProfile);
      setGame(newG);
    } else if (game.mode === 'local') {
      const newG = await gameService.createLocalGame(userProfile, game.player2?.name || 'Player 2');
      setGame(newG);
    } else {
      // Online rematch creates new room and invites other player
      const newG = await gameService.createOnlineGame(userProfile, game.targetTokensHome);
      setGame(newG);
      if (game.player2 && game.player2.uid !== userProfile.id) {
        await gameService.sendGameInvite(userProfile, {
          id: game.player2.uid,
          displayName: game.player2.name,
          avatar: game.player2.avatar,
          isOnline: true,
          lastActive: Date.now(),
          stats: { gamesPlayed: 0, wins: 0, losses: 0, streak: 0 },
          createdAt: Date.now(),
        }, newG.id, newG.roomCode);
      }
    }
  };

  // Player finished tokens count
  const p1Home = game.tokens.player1.filter((t) => t.step === 56).length;
  const p2Home = game.player2 ? game.tokens.player2.filter((t) => t.step === 56).length : 0;

  const activeColor: PlayerColor = game.currentTurn === 'player1' ? game.player1.color : (game.player2 ? game.player2.color : 'yellow');

  return (
    <div className="min-h-[calc(100vh-65px)] flex flex-col justify-between py-2 sm:py-4 px-2 sm:px-4 max-w-5xl mx-auto">
      {/* Top Header: Room Code / Opponent status */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
        {/* Room Code Badge */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 shadow-sm">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Room:
          </span>
          <span className="font-mono font-bold text-amber-400 text-xs sm:text-sm">
            {game.roomCode}
          </span>
          {game.mode === 'online' && (
            <button
              onClick={handleCopyCode}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors ml-0.5"
              title="Copy Room Code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>

        {/* Turn Status Message */}
        <div className="flex-1 max-w-sm mx-2 text-center truncate">
          {game.status === 'waiting' ? (
            <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-amber-400 animate-pulse">
              <Users className="w-3.5 h-3.5" />
              Waiting for Player 2 to join...
            </span>
          ) : (
            <div className="inline-flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${game.currentTurn === 'player1' ? 'bg-rose-500' : 'bg-amber-400'} animate-ping`} />
              <span className="text-xs sm:text-sm font-bold text-slate-200">
                {isMyTurn ? "Your Turn!" : `${game[game.currentTurn]?.name || 'Opponent'}'s Turn`}
              </span>
              {/* Timer */}
              <span className="text-xs font-mono font-semibold text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {secondsRemaining}s
              </span>
            </div>
          )}
        </div>

        {/* Actions: Chat toggle & Surrender */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowChat(!showChat)}
            className={`p-2 rounded-xl border transition-colors ${
              showChat
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Chat & Reactions"
          >
            <MessageSquare className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowSurrenderConfirm(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-800/50 transition-colors"
            title="Surrender / Leave Match"
          >
            <Flag className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Players Header Bars */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-2 sm:mb-4">
        {/* Player 1 Card (Red) */}
        <div
          className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
            game.currentTurn === 'player1'
              ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/40'
              : 'bg-slate-900/80 border-slate-800 opacity-80'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-rose-600 flex items-center justify-center text-base sm:text-xl shadow">
              {game.player1.avatar || '👑'}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-rose-500 border border-slate-900 flex items-center justify-center text-[8px] font-bold text-white">
                R
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>{game.player1.name}</span>
                {mySlot === 'player1' && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-rose-500/20 text-rose-300 font-semibold">
                    YOU
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>Home:</span>
                <span className="font-bold text-rose-400">{p1Home} / {game.targetTokensHome || 4}</span>
              </div>
            </div>
          </div>

          {game.currentTurn === 'player1' && (
            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
              Active
            </span>
          )}
        </div>

        {/* Player 2 Card (Yellow) */}
        <div
          className={`flex items-center justify-between p-2.5 sm:p-3 rounded-2xl border transition-all ${
            game.currentTurn === 'player2'
              ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/40'
              : 'bg-slate-900/80 border-slate-800 opacity-80'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-amber-400 flex items-center justify-center text-base sm:text-xl shadow text-slate-950">
              {game.player2 ? game.player2.avatar : '⏳'}
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-400 border border-slate-900 flex items-center justify-center text-[8px] font-bold text-slate-950">
                Y
              </span>
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-white truncate flex items-center gap-1.5">
                <span>{game.player2 ? game.player2.name : 'Waiting...'}</span>
                {mySlot === 'player2' && (
                  <span className="text-[10px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 font-semibold">
                    YOU
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>Home:</span>
                <span className="font-bold text-amber-400">{p2Home} / {game.targetTokensHome || 4}</span>
              </div>
            </div>
          </div>

          {game.currentTurn === 'player2' && (
            <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse">
              Active
            </span>
          )}
        </div>
      </div>

      {/* Main Board Center Area */}
      <div className="flex-1 flex flex-col items-center justify-center relative my-auto">
        <LudoBoard
          game={game}
          mySlot={mySlot}
          onTokenClick={handleTokenClick}
        />

        {/* Dice Controller floating at bottom or center */}
        <div className="mt-3 flex flex-col items-center justify-center gap-1.5">
          <Dice
            value={game.diceValue}
            isRolling={isRolling}
            canRoll={canRollDice}
            color={activeColor}
            onRoll={handleRoll}
          />
          {isAutoMoving && (
            <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 rounded-full animate-pulse">
              ⚡ Coup unique : déplacement automatique...
            </span>
          )}
        </div>

        {/* Last Move Narrative Banner */}
        {game.lastMove && (
          <div className="mt-2 text-center px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 max-w-md mx-auto shadow-sm">
            {game.lastMove.description}
          </div>
        )}
      </div>

      {/* Floating Chat & Quick Reaction Tray */}
      {showChat && (
        <div className="fixed bottom-16 right-4 sm:right-8 z-30 w-80 max-w-[calc(100vw-32px)] rounded-2xl bg-slate-900/95 border border-slate-700 shadow-2xl p-3 backdrop-blur-md">
          {/* Reaction Bar */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
            <span className="text-xs font-semibold text-slate-400">Reactions</span>
            <div className="flex items-center gap-1">
              {['🎲', '🔥', '👏', '😱', '🥳', '😭'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleSendReaction(emoji)}
                  className="p-1 text-lg hover:scale-125 transition-transform"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Messages list */}
          <div className="h-40 overflow-y-auto space-y-2 pr-1 mb-2 text-xs">
            {(!game.messages || game.messages.length === 0) && (
              <p className="text-slate-500 text-center py-6 italic">No messages yet. Send a greeting!</p>
            )}
            {game.messages?.map((msg) => (
              <div
                key={msg.id}
                className={`p-2 rounded-xl max-w-[85%] ${
                  msg.senderUid === userProfile?.id
                    ? 'ml-auto bg-amber-500/20 text-amber-200 border border-amber-500/30'
                    : 'mr-auto bg-slate-800 text-slate-200 border border-slate-700'
                }`}
              >
                <div className="text-[10px] font-bold text-slate-400 mb-0.5">{msg.senderName}</div>
                <div className={msg.isReaction ? 'text-2xl' : 'text-xs'}>{msg.text}</div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSendChat} className="flex items-center gap-1.5">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type message..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              maxLength={60}
            />
            <button
              type="submit"
              className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Surrender Confirmation Modal */}
      {showSurrenderConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 border border-slate-800 p-6 text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto mb-3 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Leave Match?</h3>
            <p className="text-xs text-slate-400 mb-6">
              Leaving or surrendering will award victory to your opponent. Are you sure?
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSurrenderConfirm(false)}
                className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Keep Playing
              </button>
              <button
                onClick={handleSurrender}
                className="flex-1 py-2 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                Yes, Resign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Victory Modal */}
      {game.status === 'completed' && (
        <VictoryModal
          game={game}
          mySlot={mySlot}
          onRematch={handleRematch}
          onReturnToLobby={onExitGame}
        />
      )}
    </div>
  );
};
