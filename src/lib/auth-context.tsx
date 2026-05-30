'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Tipi za naš Auth context
type AuthContextType = {
  user: User | null;        // Firebase user (null = neprijavljen)
  loading: boolean;          // true dokler še preverjamo, ali je prijavljen
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<User>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider — komponenta, ki "objame" celotno aplikacijo
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Ob naložitvi aplikacije — preveri, ali je uporabnik prijavljen
  // (Firebase v ozadju cache-a sejo, da po refreshu ne odjavi)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    // Cleanup — odjavi se od Firebase listenerja, ko se komponenta uniči
    return () => unsubscribe();
  }, []);

  // Login z email + geslom
  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  // Registracija novega uporabnika
  const signUp = async (email: string, password: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result.user;
  };

  // Odjava
  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, logOut }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook za enostavno uporabo v komponentah: const { user, signIn } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth() mora biti uporabljen znotraj <AuthProvider>');
  }
  return context;
}