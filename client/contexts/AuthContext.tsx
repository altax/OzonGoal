import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { migrateLocalDataToCloud, checkAndPromptMigration, getLocalDataSnapshot } from '@/lib/dataMigration';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isGuestMode: boolean;
  signInAnonymously: () => Promise<{ error: Error | null }>;
  linkEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);

  const isAuthenticated = !!user && !user.is_anonymous;
  const isAnonymous = user?.is_anonymous ?? false;

  const createUserRecord = async (userId: string, username: string) => {
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (!existingUser) {
        await supabase.from('users').insert({
          id: userId,
          username,
          password: '',
          balance: 0,
        });
      }
    } catch (error) {
      console.log('User record creation skipped or failed:', error);
    }
  };

  const handleMigration = async (
    userId: string, 
    snapshot?: Awaited<ReturnType<typeof getLocalDataSnapshot>>
  ) => {
    try {
      const hasLocalData = snapshot || await checkAndPromptMigration();
      if (hasLocalData) {
        console.log('[Auth] Local data found, starting migration...');
        const result = await migrateLocalDataToCloud(userId, snapshot);
        if (result.success && (result.migratedGoals > 0 || result.migratedShifts > 0)) {
          Alert.alert(
            'Данные перенесены',
            `Ваши локальные данные успешно синхронизированы с облаком:\n` +
            `- Целей: ${result.migratedGoals}\n` +
            `- Смен: ${result.migratedShifts}`,
            [{ text: 'OK' }]
          );
          queryClient.invalidateQueries();
        }
      }
    } catch (error) {
      console.error('[Auth] Migration error:', error);
    }
  };

  const signInAnonymously = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      
      if (!error && data.user) {
        await createUserRecord(data.user.id, `user_${data.user.id.slice(0, 8)}`);
      }
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const continueAsGuest = useCallback(() => {
    setGuestMode(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (session) {
        setSession(session);
        setUser(session.user);
        setGuestMode(false);
        
        if (!session.user.is_anonymous) {
          await handleMigration(session.user.id);
        }
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log('[Auth] State change:', event);
      
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        setSession(null);
        setUser(null);
        setGuestMode(false);
      } else if (session) {
        setSession(session);
        setUser(session.user);
        setGuestMode(false);
        
        if (event === 'SIGNED_IN' && !session.user.is_anonymous) {
          await handleMigration(session.user.id);
        }
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  const linkEmail = useCallback(async (email: string, password: string) => {
    try {
      const snapshot = await getLocalDataSnapshot();
      
      const { error } = await supabase.auth.updateUser({
        email,
        password,
      });
      
      if (!error && user) {
        await supabase.from('users').update({
          username: email.split('@')[0],
        }).eq('id', user.id);
        
        if (snapshot) {
          await handleMigration(user.id, snapshot);
        }
      }
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const snapshot = await getLocalDataSnapshot();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (!error && data.user) {
        await handleMigration(data.user.id, snapshot);
      }
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const snapshot = await getLocalDataSnapshot();
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (!error && data.user) {
        await createUserRecord(data.user.id, email.split('@')[0]);
        await handleMigration(data.user.id, snapshot);
      }
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    queryClient.clear();
    await supabase.auth.signOut({ scope: 'local' });
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ 
      user: guestMode ? null : user, 
      session: guestMode ? null : session, 
      loading, 
      isAuthenticated: guestMode ? false : isAuthenticated,
      isAnonymous: guestMode ? false : isAnonymous,
      isGuestMode: guestMode,
      signInAnonymously,
      linkEmail,
      signIn, 
      signUp, 
      signOut,
      continueAsGuest,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
