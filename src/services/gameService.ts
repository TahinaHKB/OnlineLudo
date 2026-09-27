import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  limit, 
  onSnapshot, 
  type Unsubscribe 
} from '../firebase';
import { 
  GameState, 
  PlayerSlot, 
  PlayerInfo, 
  GameInvite, 
  MatchHistoryRecord, 
  Token, 
  UserProfile, 
  ChatMessage 
} from '../types/ludo';
import { getValidMoves, applyTokenMove } from '../utils/gameRules';

const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const createInitialTokens = (): Token[] => [
  { id: 0, step: -1 },
  { id: 1, step: -1 },
  { id: 2, step: -1 },
  { id: 3, step: -1 },
];

export const gameService = {
  /**
   * Create an online multiplayer game room
   */
  async createOnlineGame(creator: UserProfile, targetTokensHome: number = 4): Promise<GameState> {
    const gameId = doc(collection(db, 'games')).id;
    const roomCode = generateRoomCode();

    const player1: PlayerInfo = {
      uid: creator.id,
      name: creator.displayName,
      avatar: creator.avatar,
      color: 'red',
      connected: true,
    };

    const newGame: GameState = {
      id: gameId,
      roomCode,
      mode: 'online',
      status: 'waiting',
      targetTokensHome,
      player1,
      player2: null,
      currentTurn: 'player1',
      diceValue: null,
      diceRolled: false,
      consecutiveSixes: 0,
      tokens: {
        player1: createInitialTokens(),
        player2: createInitialTokens(),
      },
      validMoves: [],
      winner: null,
      lastMove: null,
      turnDeadline: Date.now() + 30000,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, 'games', gameId), newGame);
    return newGame;
  },

  /**
   * Create a local pass-and-play game on the same device
   */
  async createLocalGame(creator: UserProfile, player2Name: string = 'Player 2'): Promise<GameState> {
    const gameId = `local_${Date.now()}`;
    const roomCode = 'LOCAL';

    const player1: PlayerInfo = {
      uid: creator.id,
      name: creator.displayName,
      avatar: creator.avatar,
      color: 'red',
      connected: true,
    };

    const player2: PlayerInfo = {
      uid: 'local_player2',
      name: player2Name,
      avatar: '🦊',
      color: 'yellow',
      connected: true,
    };

    const newGame: GameState = {
      id: gameId,
      roomCode,
      mode: 'local',
      status: 'playing',
      targetTokensHome: 4,
      player1,
      player2,
      currentTurn: 'player1',
      diceValue: null,
      diceRolled: false,
      consecutiveSixes: 0,
      tokens: {
        player1: createInitialTokens(),
        player2: createInitialTokens(),
      },
      validMoves: [],
      winner: null,
      lastMove: null,
      turnDeadline: Date.now() + 30000,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return newGame;
  },

  /**
   * Create a match against smart Bot AI
   */
  async createBotGame(creator: UserProfile): Promise<GameState> {
    const gameId = `bot_${Date.now()}`;
    const roomCode = 'SOLO';

    const player1: PlayerInfo = {
      uid: creator.id,
      name: creator.displayName,
      avatar: creator.avatar,
      color: 'red',
      connected: true,
    };

    const player2: PlayerInfo = {
      uid: 'ai_bot',
      name: 'Ludo Bot (AI)',
      avatar: '🤖',
      color: 'yellow',
      connected: true,
    };

    const newGame: GameState = {
      id: gameId,
      roomCode,
      mode: 'bot',
      status: 'playing',
      targetTokensHome: 4,
      player1,
      player2,
      currentTurn: 'player1',
      diceValue: null,
      diceRolled: false,
      consecutiveSixes: 0,
      tokens: {
        player1: createInitialTokens(),
        player2: createInitialTokens(),
      },
      validMoves: [],
      winner: null,
      lastMove: null,
      turnDeadline: Date.now() + 30000,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return newGame;
  },

  /**
   * Join an online game via 6-character roomCode
   */
  async joinGameByCode(user: UserProfile, roomCode: string): Promise<GameState> {
    const cleanCode = roomCode.trim().toUpperCase();
    const q = query(collection(db, 'games'), where('roomCode', '==', cleanCode), limit(1));
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error(`Room code "${cleanCode}" not found.`);
    }

    const docSnap = snap.docs[0];
    const game = docSnap.data() as GameState;

    if (game.status === 'completed' || game.status === 'abandoned') {
      throw new Error('This match has already concluded.');
    }

    // If user is already player1, return game
    if (game.player1.uid === user.id) {
      return game;
    }

    // If user is already player2, return game
    if (game.player2 && game.player2.uid === user.id) {
      return game;
    }

    // If room is full
    if (game.player2 && game.player2.uid !== user.id) {
      throw new Error('This room is already full (2/2 players).');
    }

    // Join as player2
    const player2: PlayerInfo = {
      uid: user.id,
      name: user.displayName,
      avatar: user.avatar,
      color: 'yellow',
      connected: true,
    };

    const updatedData: Partial<GameState> = {
      player2,
      status: 'playing',
      turnDeadline: Date.now() + 30000,
      updatedAt: Date.now(),
    };

    await updateDoc(doc(db, 'games', game.id), updatedData);
    return { ...game, ...updatedData, player2 };
  },

  /**
   * Subscribe to real-time game updates
   */
  subscribeToGame(gameId: string, onUpdate: (game: GameState) => void): Unsubscribe {
    const unsub = onSnapshot(doc(db, 'games', gameId), (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as GameState);
      }
    });
    return unsub;
  },

  /**
   * Roll the dice for the current turn
   */
  async rollDice(game: GameState, rollerSlot: PlayerSlot, forcedValue?: number): Promise<void> {
    if (game.status !== 'playing') return;
    if (game.currentTurn !== rollerSlot) return;
    if (game.diceRolled) return; // already rolled, waiting for token move

    const rollValue = forcedValue !== undefined ? forcedValue : Math.floor(Math.random() * 6) + 1;
    const tokens = game.tokens[rollerSlot];
    const validMoves = getValidMoves(tokens, rollValue);

    // If no moves are possible
    if (validMoves.length === 0) {
      // Consecutive sixes check
      const rolledSix = rollValue === 6;
      const consecutiveSixes = rolledSix ? (game.consecutiveSixes || 0) + 1 : 0;
      const opponentSlot: PlayerSlot = rollerSlot === 'player1' ? 'player2' : 'player1';

      const updatedGame: Partial<GameState> = {
        diceValue: rollValue,
        diceRolled: true,
        validMoves: [],
        consecutiveSixes,
        updatedAt: Date.now(),
      };

      if (game.mode === 'online') {
        await updateDoc(doc(db, 'games', game.id), updatedGame);
        // Automatically switch turn after short delay so players see the rolled number
        setTimeout(async () => {
          await updateDoc(doc(db, 'games', game.id), {
            currentTurn: opponentSlot,
            diceValue: null,
            diceRolled: false,
            validMoves: [],
            consecutiveSixes: 0,
            turnDeadline: Date.now() + 30000,
            updatedAt: Date.now(),
          }).catch(() => {});
        }, 1200);
      }
      return;
    }

    const updatedGame: Partial<GameState> = {
      diceValue: rollValue,
      diceRolled: true,
      validMoves,
      updatedAt: Date.now(),
    };

    if (game.mode === 'online') {
      await updateDoc(doc(db, 'games', game.id), updatedGame);
    }
  },

  /**
   * Move selected token
   */
  async moveToken(
    game: GameState,
    movingSlot: PlayerSlot,
    tokenIndex: number
  ): Promise<GameState> {
    if (game.status !== 'playing') return game;
    if (game.currentTurn !== movingSlot) return game;
    if (!game.diceRolled || game.diceValue === null) return game;
    if (!game.validMoves.includes(tokenIndex)) return game;

    const { updatedGameState } = applyTokenMove(
      game,
      movingSlot,
      tokenIndex,
      game.diceValue
    );

    if (game.mode === 'online') {
      await updateDoc(doc(db, 'games', game.id), {
        ...updatedGameState,
      });

      // If game reached completed, record in match history
      if (updatedGameState.status === 'completed' && updatedGameState.winner) {
        await this.recordFinishedMatch(updatedGameState);
      }
    }

    return updatedGameState;
  },

  /**
   * In-game chat/reaction
   */
  async sendMessage(
    gameId: string,
    senderUid: string,
    senderName: string,
    senderSlot: PlayerSlot,
    text: string,
    isReaction: boolean = false
  ): Promise<void> {
    const gameRef = doc(db, 'games', gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;
    const data = snap.data() as GameState;
    const currentMessages = data.messages || [];

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderUid,
      senderName,
      senderSlot,
      text,
      isReaction,
      timestamp: Date.now(),
    };

    // Keep last 30 messages
    const trimmed = [...currentMessages, newMsg].slice(-30);
    await updateDoc(gameRef, { messages: trimmed });
  },

  /**
   * Surrender / Abandon match
   */
  async surrenderGame(game: GameState, resigningSlot: PlayerSlot): Promise<void> {
    const winnerSlot: PlayerSlot = resigningSlot === 'player1' ? 'player2' : 'player1';
    const updated: Partial<GameState> = {
      status: 'completed',
      winner: winnerSlot,
      updatedAt: Date.now(),
    };

    if (game.mode === 'online') {
      await updateDoc(doc(db, 'games', game.id), updated);
      await this.recordFinishedMatch({ ...game, ...updated, winner: winnerSlot, status: 'completed' });
    }
  },

  /**
   * Record match summary to matches collection
   */
  async recordFinishedMatch(game: GameState): Promise<void> {
    try {
      if (!game.winner || !game.player2) return;
      const matchId = doc(collection(db, 'matches')).id;
      const winnerPlayer = game[game.winner]!;
      const loserSlot: PlayerSlot = game.winner === 'player1' ? 'player2' : 'player1';
      const loserPlayer = game[loserSlot]!;

      const p1Finished = game.tokens.player1.filter((t) => t.step === 56).length;
      const p2Finished = game.tokens.player2.filter((t) => t.step === 56).length;

      const durationSeconds = Math.max(10, Math.floor((Date.now() - game.createdAt) / 1000));

      const record: MatchHistoryRecord = {
        id: matchId,
        gameId: game.id,
        player1Uid: game.player1.uid,
        player1Name: game.player1.name,
        player1Color: game.player1.color,
        player2Uid: game.player2.uid,
        player2Name: game.player2.name,
        player2Color: game.player2.color,
        winnerUid: winnerPlayer.uid,
        winnerName: winnerPlayer.name,
        winnerSlot: game.winner,
        turnsCount: 20, // estimated
        durationSeconds,
        player1TokensFinished: p1Finished,
        player2TokensFinished: p2Finished,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'matches', matchId), record);

      // Also update winner and loser stats in users collection if not bot
      if (winnerPlayer.uid && !winnerPlayer.uid.startsWith('ai_') && !winnerPlayer.uid.startsWith('local_')) {
        const winRef = doc(db, 'users', winnerPlayer.uid);
        const winSnap = await getDoc(winRef);
        if (winSnap.exists()) {
          const stats = winSnap.data().stats || { gamesPlayed: 0, wins: 0, losses: 0, streak: 0 };
          await updateDoc(winRef, {
            stats: {
              ...stats,
              gamesPlayed: stats.gamesPlayed + 1,
              wins: stats.wins + 1,
              streak: stats.streak + 1,
            },
          });
        }
      }

      if (loserPlayer.uid && !loserPlayer.uid.startsWith('ai_') && !loserPlayer.uid.startsWith('local_')) {
        const loseRef = doc(db, 'users', loserPlayer.uid);
        const loseSnap = await getDoc(loseRef);
        if (loseSnap.exists()) {
          const stats = loseSnap.data().stats || { gamesPlayed: 0, wins: 0, losses: 0, streak: 0 };
          await updateDoc(loseRef, {
            stats: {
              ...stats,
              gamesPlayed: stats.gamesPlayed + 1,
              losses: stats.losses + 1,
              streak: 0,
            },
          });
        }
      }
    } catch (err) {
      console.error('Failed to record match:', err);
    }
  },

  /**
   * Send game invite to a recipient user
   */
  async sendGameInvite(
    sender: UserProfile,
    recipient: UserProfile,
    gameId: string,
    roomCode: string
  ): Promise<GameInvite> {
    const inviteId = doc(collection(db, 'invites')).id;
    const invite: GameInvite = {
      id: inviteId,
      senderUid: sender.id,
      senderName: sender.displayName,
      senderAvatar: sender.avatar,
      recipientUid: recipient.id,
      recipientName: recipient.displayName,
      gameId,
      roomCode,
      status: 'pending',
      createdAt: Date.now(),
    };

    await setDoc(doc(db, 'invites', inviteId), invite);
    return invite;
  },

  /**
   * Listen for incoming invites to current user
   */
  subscribeToIncomingInvites(
    userUid: string,
    onInvites: (invites: GameInvite[]) => void
  ): Unsubscribe {
    const q = query(
      collection(db, 'invites'),
      where('recipientUid', '==', userUid),
      where('status', '==', 'pending')
    );

    return onSnapshot(q, (snap) => {
      const list: GameInvite[] = [];
      snap.forEach((d) => list.push(d.data() as GameInvite));
      onInvites(list);
    });
  },

  /**
   * Accept invite
   */
  async acceptInvite(inviteId: string): Promise<void> {
    await updateDoc(doc(db, 'invites', inviteId), {
      status: 'accepted',
    });
  },

  /**
   * Decline invite
   */
  async declineInvite(inviteId: string): Promise<void> {
    await updateDoc(doc(db, 'invites', inviteId), {
      status: 'declined',
    });
  },

  /**
   * Fetch match history for a user
   */
  async getUserMatches(userUid: string): Promise<MatchHistoryRecord[]> {
    try {
      const q1 = query(collection(db, 'matches'), where('player1Uid', '==', userUid), limit(30));
      const q2 = query(collection(db, 'matches'), where('player2Uid', '==', userUid), limit(30));

      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const map = new Map<string, MatchHistoryRecord>();

      snap1.forEach((d) => map.set(d.id, d.data() as MatchHistoryRecord));
      snap2.forEach((d) => map.set(d.id, d.data() as MatchHistoryRecord));

      const matches = Array.from(map.values());
      return matches.sort((a, b) => b.createdAt - a.createdAt);
    } catch (err) {
      console.error('Failed to get match history:', err);
      return [];
    }
  },

  /**
   * Fetch online players for lobby
   */
  async getOnlinePlayers(excludeUid?: string): Promise<UserProfile[]> {
    try {
      const q = query(collection(db, 'users'), where('isOnline', '==', true), limit(25));
      const snap = await getDocs(q);
      const list: UserProfile[] = [];
      snap.forEach((d) => {
        const u = d.data() as UserProfile;
        if (!excludeUid || u.id !== excludeUid) {
          list.push(u);
        }
      });
      return list;
    } catch {
      return [];
    }
  },
};
