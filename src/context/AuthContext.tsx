import React, { createContext, useContext, useEffect, useState, useTransition } from 'react';
import { 
  auth, 
  db, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signInAnonymously, 
  signOut as fbSignOut, 
  updateProfile as fbUpdateProfile,
  onAuthStateChanged, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  type User 
} from '../firebase';
import { UserProfile } from '../types/ludo';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (name: string, email: string, pass: string, avatar?: string) => Promise<void>;
  signInAsGuest: (customName?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfileDetails: (name: string, avatar: string) => Promise<void>;
  recordMatchResult: (won: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_AVATARS = ['👑', '🦁', '🦊', '🚀', '⚡', '🐉', '🎯', '🔥', '🎲', '⭐'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [, startTransition] = useTransition();

  // Helper to ensure profile document exists in Firestore
  const syncUserProfile = async (user: User, fallbackName?: string, fallbackAvatar?: string) => {
    try {
      const userRef = doc(db, 'users', user.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        // Mark online
        await updateDoc(userRef, {
          isOnline: true,
          lastActive: Date.now(),
        }).catch(() => {});
        startTransition(() => {
          setUserProfile({
            ...data,
            isOnline: true,
            lastActive: Date.now(),
          });
        });
      } else {
        const randomAvatar = fallbackAvatar || DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
        const displayName = fallbackName || user.displayName || (user.isAnonymous ? `Player_${user.uid.slice(0, 5)}` : (user.email?.split('@')[0] || 'Player'));
        
        const newProfile: UserProfile = {
          id: user.uid,
          displayName,
          email: user.email || undefined,
          avatar: randomAvatar,
          isOnline: true,
          lastActive: Date.now(),
          stats: {
            gamesPlayed: 0,
            wins: 0,
            losses: 0,
            streak: 0,
          },
          createdAt: Date.now(),
        };

        await setDoc(userRef, newProfile);
        startTransition(() => {
          setUserProfile(newProfile);
        });
      }
    } catch (err) {
      console.error('Failed to sync profile:', err);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      startTransition(() => {
        setCurrentUser(user);
      });
      if (user) {
        await syncUserProfile(user);
      } else {
        startTransition(() => {
          setUserProfile(null);
        });
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await syncUserProfile(cred.user);
  };

  const signUpWithEmail = async (name: string, email: string, pass: string, avatar?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await fbUpdateProfile(cred.user, { displayName: name });
    await syncUserProfile(cred.user, name, avatar);
  };

  const signInAsGuest = async (customName?: string) => {
    const cred = await signInAnonymously(auth);
    const guestName = customName?.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
    const randomAvatar = DEFAULT_AVATARS[Math.floor(Math.random() * DEFAULT_AVATARS.length)];
    await fbUpdateProfile(cred.user, { displayName: guestName });
    await syncUserProfile(cred.user, guestName, randomAvatar);
  };

  const logout = async () => {
    if (currentUser) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, { isOnline: false, lastActive: Date.now() });
      } catch {
        // ignore
      }
    }
    await fbSignOut(auth);
    startTransition(() => {
      setCurrentUser(null);
      setUserProfile(null);
    });
  };

  const updateProfileDetails = async (name: string, avatar: string) => {
    if (!currentUser || !userProfile) return;
    const cleanName = name.trim() || userProfile.displayName;
    await fbUpdateProfile(currentUser, { displayName: cleanName });
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, {
      displayName: cleanName,
      avatar,
      lastActive: Date.now(),
    });
    startTransition(() => {
      setUserProfile((prev) => (prev ? { ...prev, displayName: cleanName, avatar } : null));
    });
  };

  const recordMatchResult = async (won: boolean) => {
    if (!currentUser || !userProfile) return;
    const stats = userProfile.stats || { gamesPlayed: 0, wins: 0, losses: 0, streak: 0 };
    const newStats = {
      gamesPlayed: stats.gamesPlayed + 1,
      wins: stats.wins + (won ? 1 : 0),
      losses: stats.losses + (won ? 0 : 1),
      streak: won ? stats.streak + 1 : 0,
    };
    const userRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userRef, { stats: newStats });
    startTransition(() => {
      setUserProfile((prev) => (prev ? { ...prev, stats: newStats } : null));
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
        logout,
        updateProfileDetails,
        recordMatchResult,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
