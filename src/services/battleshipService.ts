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
  BattleshipGame, 
  BattleshipPlayerState, 
  PlacedShip 
} from '../types/battleship';
import { UserProfile, MatchHistoryRecord } from '../types/ludo';
import { generateRandomFleet, processShot } from '../utils/battleshipRules';

// Use 'games' collection to ensure 100% compatibility with existing Firestore security rules
const GAMES_COLLECTION = 'games';

const generateBattleshipRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = 'NAV-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const battleshipService = {
  /**
   * Create an online Battleship game room in Firestore
   */
  async createOnlineGame(creator: UserProfile): Promise<BattleshipGame> {
    const gameId = doc(collection(db, GAMES_COLLECTION)).id;
    const roomCode = generateBattleshipRoomCode();

    const player1: BattleshipPlayerState = {
      uid: creator.id,
      name: creator.displayName,
      avatar: creator.avatar,
      ready: false,
      ships: [],
      shotsReceived: [],
    };

    const newGame: BattleshipGame = {
      id: gameId,
      roomCode,
      mode: 'online',
      status: 'waiting',
      currentTurn: 'player1',
      player1,
      player2: null,
      winner: null,
      lastShot: null,
      turnDeadline: Date.now() + 45000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    await setDoc(doc(db, GAMES_COLLECTION, gameId), {
      ...newGame,
      gameType: 'battleship',
    });
    return newGame;
  },

  /**
   * Create a local 2P Battleship game on the same device
   */
  async createLocalGame(creator: UserProfile, p2Name: string = 'Joueur 2'): Promise<BattleshipGame> {
    const gameId = `local_nav_${Date.now()}`;
    const roomCode = 'LOCAL-NAV';

    const player1: BattleshipPlayerState = {
      uid: creator.id,
      name: creator.displayName,
      avatar: creator.avatar,
      ready: false,
      ships: [],
      shotsReceived: [],
    };

    const player2: BattleshipPlayerState = {
      uid: 'local_p2',
      name: p2Name,
      avatar: '🦊',
      ready: false,
      ships: [],
      shotsReceived: [],
    };

    const newGame: BattleshipGame = {
      id: gameId,
      roomCode,
      mode: 'local',
      status: 'placement',
      currentTurn: 'player1',
      player1,
      player2,
      winner: null,
      lastShot: null,
      turnDeadline: Date.now() + 45000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return newGame;
  },

  /**
   * Create a match against smart Bot AI
   */
  async createBotGame(creator: UserProfile): Promise<BattleshipGame> {
    const gameId = `bot_nav_${Date.now()}`;
    const roomCode = 'SOLO-NAV';

    const player1: BattleshipPlayerState = {
      uid: creator.id,
      name: creator.displayName,
      avatar: creator.avatar,
      ready: false,
      ships: [],
      shotsReceived: [],
    };

    // Bot generates its fleet automatically
    const botFleet = generateRandomFleet();
    const player2: BattleshipPlayerState = {
      uid: 'ai_bot',
      name: 'Amiral Bot (IA)',
      avatar: '🤖',
      ready: true,
      ships: botFleet,
      shotsReceived: [],
    };

    const newGame: BattleshipGame = {
      id: gameId,
      roomCode,
      mode: 'bot',
      status: 'placement',
      currentTurn: 'player1',
      player1,
      player2,
      winner: null,
      lastShot: null,
      turnDeadline: Date.now() + 45000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    return newGame;
  },

  /**
   * Join an online Battleship room by code
   */
  async joinGameByCode(user: UserProfile, roomCode: string): Promise<BattleshipGame> {
    const cleanCode = roomCode.trim().toUpperCase();
    const q = query(
      collection(db, GAMES_COLLECTION),
      where('roomCode', '==', cleanCode),
      limit(1)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      throw new Error(`Code de salle "${cleanCode}" introuvable.`);
    }

    const docSnap = snap.docs[0];
    const game = docSnap.data() as BattleshipGame;

    if (game.status === 'completed' || game.status === 'abandoned') {
      throw new Error('Cette partie est déjà terminée.');
    }

    if (game.player1.uid === user.id) {
      return game;
    }

    if (game.player2 && game.player2.uid === user.id) {
      return game;
    }

    if (game.player2 && game.player2.uid !== user.id) {
      throw new Error('Cette salle est déjà complète (2/2 joueurs).');
    }

    const player2: BattleshipPlayerState = {
      uid: user.id,
      name: user.displayName,
      avatar: user.avatar,
      ready: false,
      ships: [],
      shotsReceived: [],
    };

    const updatedData: Partial<BattleshipGame> = {
      player2,
      status: 'placement',
      updatedAt: Date.now(),
    };

    await updateDoc(doc(db, GAMES_COLLECTION, game.id), updatedData);
    return { ...game, ...updatedData, player2 };
  },

  /**
   * Subscribe to real-time Battleship updates
   */
  subscribeToGame(gameId: string, onUpdate: (game: BattleshipGame) => void): Unsubscribe {
    const unsub = onSnapshot(doc(db, GAMES_COLLECTION, gameId), (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as BattleshipGame);
      }
    });
    return unsub;
  },

  /**
   * Player confirms their ship placements
   */
  async confirmFleet(
    game: BattleshipGame,
    playerSlot: 'player1' | 'player2',
    ships: PlacedShip[]
  ): Promise<BattleshipGame> {
    let currentGame = game;

    if (game.mode === 'online') {
      try {
        const snap = await getDoc(doc(db, GAMES_COLLECTION, game.id));
        if (snap.exists()) {
          currentGame = snap.data() as BattleshipGame;
        }
      } catch (err) {
        console.warn('Could not read latest doc in confirmFleet:', err);
      }
    }

    const isP1 = playerSlot === 'player1';
    const targetPlayer = isP1 ? { ...currentGame.player1 } : { ...currentGame.player2! };
    targetPlayer.ships = ships;
    targetPlayer.ready = true;

    // Check if both players are now ready
    const otherPlayer = isP1 ? currentGame.player2 : currentGame.player1;
    const bothReady = Boolean(otherPlayer && otherPlayer.ready);

    const updatedState: BattleshipGame = {
      ...currentGame,
      player1: isP1 ? targetPlayer : currentGame.player1,
      player2: !isP1 ? targetPlayer : currentGame.player2,
      status: bothReady ? 'playing' : 'placement',
      turnDeadline: Date.now() + 45000,
      updatedAt: Date.now(),
    };

    if (currentGame.mode === 'online') {
      await updateDoc(doc(db, GAMES_COLLECTION, currentGame.id), {
        player1: updatedState.player1,
        player2: updatedState.player2,
        status: updatedState.status,
        turnDeadline: updatedState.turnDeadline,
        updatedAt: updatedState.updatedAt,
      });
    }

    return updatedState;
  },

  /**
   * Fire a missile onto opponent's grid
   */
  async fireShot(
    game: BattleshipGame,
    shooterSlot: 'player1' | 'player2',
    r: number,
    c: number
  ): Promise<{
    updatedGame: BattleshipGame;
    isHit: boolean;
    sunkShipName?: string;
    isVictory: boolean;
  }> {
    if (game.status !== 'playing') {
      return { updatedGame: game, isHit: false, isVictory: false };
    }
    if (game.currentTurn !== shooterSlot) {
      return { updatedGame: game, isHit: false, isVictory: false };
    }

    let currentGame = game;
    if (game.mode === 'online') {
      try {
        const gameRef = doc(db, GAMES_COLLECTION, game.id);
        const snap = await getDoc(gameRef);
        if (snap.exists()) {
          currentGame = snap.data() as BattleshipGame;
        }
      } catch (err) {
        console.warn('Could not fetch latest doc before shot:', err);
      }
    }

    const opponentSlot = shooterSlot === 'player1' ? 'player2' : 'player1';
    const opponent = opponentSlot === 'player1' ? { ...currentGame.player1 } : { ...currentGame.player2! };

    const { updatedShips, updatedShots, isHit, sunkShipName, allSunk } = processShot(
      opponent.ships,
      opponent.shotsReceived,
      r,
      c
    );

    opponent.ships = updatedShips;
    opponent.shotsReceived = updatedShots;

    // Rule: Touching an enemy ship keeps the turn! Missing passes the turn to opponent.
    const nextTurn = (allSunk || isHit) ? shooterSlot : opponentSlot;

    // Guaranteed zero undefined fields so Firestore updateDoc never fails
    const lastShotData = {
      shooter: shooterSlot,
      r,
      c,
      isHit,
      sunkShipName: sunkShipName || '',
      timestamp: Date.now(),
    };

    const updatedGame: BattleshipGame = {
      ...currentGame,
      status: allSunk ? 'completed' : 'playing',
      winner: allSunk ? shooterSlot : null,
      currentTurn: nextTurn,
      player1: opponentSlot === 'player1' ? opponent : currentGame.player1,
      player2: opponentSlot === 'player2' ? opponent : currentGame.player2,
      lastShot: lastShotData,
      turnDeadline: Date.now() + 45000,
      updatedAt: Date.now(),
    };

    if (currentGame.mode === 'online') {
      const gameRef = doc(db, GAMES_COLLECTION, currentGame.id);
      await updateDoc(gameRef, {
        status: updatedGame.status,
        winner: updatedGame.winner,
        currentTurn: updatedGame.currentTurn,
        player1: updatedGame.player1,
        player2: updatedGame.player2,
        lastShot: updatedGame.lastShot,
        turnDeadline: updatedGame.turnDeadline,
        updatedAt: updatedGame.updatedAt,
      });

      if (allSunk) {
        await this.recordFinishedMatch(updatedGame);
      }
    }

    return {
      updatedGame,
      isHit,
      sunkShipName,
      isVictory: allSunk,
    };
  },

  /**
   * Record match summary to matches collection
   */
  async recordFinishedMatch(game: BattleshipGame): Promise<void> {
    try {
      if (!game.winner || !game.player2) return;
      const matchId = doc(collection(db, 'matches')).id;
      const winnerPlayer = game[game.winner]!;
      const loserSlot = game.winner === 'player1' ? 'player2' : 'player1';
      const loserPlayer = game[loserSlot]!;

      const p1Sunk = game.player1.ships.filter((s) => s.sunk).length;
      const p2Sunk = game.player2.ships.filter((s) => s.sunk).length;

      const durationSeconds = Math.max(10, Math.floor((Date.now() - game.createdAt) / 1000));

      const record: MatchHistoryRecord = {
        id: matchId,
        gameId: game.id,
        gameType: 'battleship',
        player1Uid: game.player1.uid,
        player1Name: game.player1.name,
        player1Color: 'blue',
        player2Uid: game.player2.uid,
        player2Name: game.player2.name,
        player2Color: 'red',
        winnerUid: winnerPlayer.uid,
        winnerName: winnerPlayer.name,
        winnerSlot: game.winner,
        turnsCount: game.player1.shotsReceived.length + game.player2.shotsReceived.length,
        durationSeconds,
        player1TokensFinished: 5 - p2Sunk, // ships surviving
        player2TokensFinished: 5 - p1Sunk,
        createdAt: Date.now(),
      };

      await setDoc(doc(db, 'matches', matchId), record);

      // Update player profile stats
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
      console.error('Failed to record naval match:', err);
    }
  },
};
