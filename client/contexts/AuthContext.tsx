import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAnonymous: boolean;
  signInAnonymously: () => Promise<{ error: Error | null }>;
  linkEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!mounted) return;

      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!mounted) return;
        
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.user);
          if (data.user) {
            await createUserRecord(data.user.id, `user_${data.user.id.slice(0, 8)}`);
          }
        }
        setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      setSession(session);
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_OUT') {
        queryClient.clear();
        
        const { data, error } = await supabase.auth.signInAnonymously();
        if (!mounted) return;
        
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.user);
          if (data.user) {
            await createUserRecord(data.user.id, `user_${data.user.id.slice(0, 8)}`);
          }
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
      const { error } = await supabase.auth.updateUser({
        email,
        password,
      });
      
      if (!error && user) {
        await supabase.from('users').update({
          username: email.split('@')[0],
        }).eq('id', user.id);
      }
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, [user]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (!error) {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await createUserRecord(newUser.id, email.split('@')[0]);
        }
      }
      
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  const signOut = useCallback(async () => {
    queryClient.clear();
    await supabase.auth.signOut();
  }, [queryClient]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      loading, 
      isAnonymous,
      signInAnonymously,
      linkEmail,
      signIn, 
      signUp, 
      signOut 
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
