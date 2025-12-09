import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { migrateLocalDataToCloud, getLocalDataSnapshot } from '@/lib/dataMigration';
import { localStorageService } from '@/lib/localStorage';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAnonymous: boolean;
  isGuestMode: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  continueAsGuest: () => void;
  upgradeGuestToUser: (email: string, password: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOG_PREFIX = '[AuthContext]';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [guestMode, setGuestMode] = useState(false);
  
  const migrationInProgress = useRef(false);
  const pendingMigrationSnapshot = useRef<Awaited<ReturnType<typeof getLocalDataSnapshot>> | null>(null);

  const isAuthenticated = !!user && !user.is_anonymous;
  const isAnonymous = user?.is_anonymous ?? false;

  const createUserRecord = useCallback(async (userId: string, username: string) => {
    try {
      console.log(`${LOG_PREFIX} Creating user record for:`, userId);
      
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        console.error(`${LOG_PREFIX} Error checking existing user:`, selectError);
      }

      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert({
          id: userId,
          username,
          password: '',
          balance: 0,
        });
        
        if (insertError) {
          console.error(`${LOG_PREFIX} Error creating user record:`, insertError);
        } else {
          console.log(`${LOG_PREFIX} User record created successfully`);
        }
      } else {
        console.log(`${LOG_PREFIX} User record already exists`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Failed to create user record:`, error);
    }
  }, []);

  const performMigration = useCallback(async (
    userId: string, 
    snapshot?: Awaited<ReturnType<typeof getLocalDataSnapshot>>
  ) => {
    if (migrationInProgress.current) {
      console.log(`${LOG_PREFIX} Migration already in progress, skipping`);
      return;
    }

    try {
      migrationInProgress.current = true;
      console.log(`${LOG_PREFIX} Starting migration check for user:`, userId);
      
      const dataToMigrate = snapshot || await getLocalDataSnapshot();
      
      if (!dataToMigrate) {
        console.log(`${LOG_PREFIX} No local data to migrate`);
        return;
      }

      console.log(`${LOG_PREFIX} Found local data to migrate:`, {
        goals: dataToMigrate.goals.length,
        shifts: dataToMigrate.shifts.length,
        allocations: dataToMigrate.allocations.length,
        balance: dataToMigrate.user.balance,
      });

      const result = await migrateLocalDataToCloud(userId, dataToMigrate);
      
      if (result.success) {
        console.log(`${LOG_PREFIX} Migration completed:`, result);
        
        if (result.migratedGoals > 0 || result.migratedShifts > 0) {
          Alert.alert(
            'Данные перенесены',
            `Ваши локальные данные успешно синхронизированы:\n` +
            `- Целей: ${result.migratedGoals}\n` +
            `- Смен: ${result.migratedShifts}`,
            [{ text: 'OK' }]
          );
          queryClient.invalidateQueries();
        }
      } else {
        console.error(`${LOG_PREFIX} Migration failed:`, result.error);
        Alert.alert(
          'Ошибка миграции',
          'Не удалось перенести локальные данные. Попробуйте снова позже.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Migration error:`, error);
    } finally {
      migrationInProgress.current = false;
      pendingMigrationSnapshot.current = null;
    }
  }, [queryClient]);

  const continueAsGuest = useCallback(() => {
    console.log(`${LOG_PREFIX} User continuing as guest`);
    setGuestMode(true);
    setUser(null);
    setSession(null);
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log(`${LOG_PREFIX} Attempting sign in for:`, email);
    
    try {
      const snapshot = guestMode ? await getLocalDataSnapshot() : null;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error(`${LOG_PREFIX} Sign in error:`, error.message);
        return { error };
      }

      console.log(`${LOG_PREFIX} Sign in successful`);
      
      if (data.user && snapshot) {
        pendingMigrationSnapshot.current = snapshot;
        setGuestMode(false);
        await performMigration(data.user.id, snapshot);
      }

      return { error: null };
    } catch (error) {
      console.error(`${LOG_PREFIX} Sign in exception:`, error);
      return { error: error as Error };
    }
  }, [guestMode, performMigration]);

  const signUp = useCallback(async (email: string, password: string) => {
    console.log(`${LOG_PREFIX} Attempting sign up for:`, email);
    
    try {
      const snapshot = guestMode ? await getLocalDataSnapshot() : null;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error(`${LOG_PREFIX} Sign up error:`, error.message);
        return { error };
      }

      console.log(`${LOG_PREFIX} Sign up successful`);
      
      if (data.user) {
        await createUserRecord(data.user.id, email.split('@')[0]);
        
        if (snapshot) {
          pendingMigrationSnapshot.current = snapshot;
          setGuestMode(false);
          await performMigration(data.user.id, snapshot);
        }
      }

      return { error: null };
    } catch (error) {
      console.error(`${LOG_PREFIX} Sign up exception:`, error);
      return { error: error as Error };
    }
  }, [guestMode, createUserRecord, performMigration]);

  const upgradeGuestToUser = useCallback(async (email: string, password: string) => {
    console.log(`${LOG_PREFIX} Upgrading guest to registered user:`, email);
    
    if (!guestMode) {
      console.log(`${LOG_PREFIX} Not in guest mode, using regular sign up`);
      return signUp(email, password);
    }

    try {
      const snapshot = await getLocalDataSnapshot();
      console.log(`${LOG_PREFIX} Guest data snapshot:`, snapshot ? 'has data' : 'no data');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        console.error(`${LOG_PREFIX} Upgrade error:`, error.message);
        return { error };
      }

      if (data.user) {
        console.log(`${LOG_PREFIX} User created, setting up account`);
        await createUserRecord(data.user.id, email.split('@')[0]);
        
        if (snapshot) {
          console.log(`${LOG_PREFIX} Migrating guest data to new account`);
          setGuestMode(false);
          await performMigration(data.user.id, snapshot);
        }
      }

      return { error: null };
    } catch (error) {
      console.error(`${LOG_PREFIX} Upgrade exception:`, error);
      return { error: error as Error };
    }
  }, [guestMode, signUp, createUserRecord, performMigration]);

  const signOut = useCallback(async () => {
    console.log(`${LOG_PREFIX} Signing out`);
    
    try {
      queryClient.clear();
      
      if (guestMode) {
        console.log(`${LOG_PREFIX} Clearing guest mode state`);
        setGuestMode(false);
        setUser(null);
        setSession(null);
        return;
      }

      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        console.error(`${LOG_PREFIX} Sign out error:`, error);
      } else {
        console.log(`${LOG_PREFIX} Sign out successful`);
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Sign out exception:`, error);
    }
  }, [guestMode, queryClient]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      console.log(`${LOG_PREFIX} Initializing authentication`);
      
      if (!isSupabaseConfigured()) {
        console.warn(`${LOG_PREFIX} Supabase not configured, falling back to guest mode`);
        if (mounted) {
          setGuestMode(true);
          setLoading(false);
        }
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error(`${LOG_PREFIX} Error getting session:`, error);
          setLoading(false);
          return;
        }

        if (session) {
          console.log(`${LOG_PREFIX} Existing session found for:`, session.user.email || session.user.id);
          setSession(session);
          setUser(session.user);
          setGuestMode(false);
          
          if (!session.user.is_anonymous) {
            await performMigration(session.user.id);
          }
        } else {
          console.log(`${LOG_PREFIX} No existing session`);
          setSession(null);
          setUser(null);
        }
        
        setLoading(false);
      } catch (error) {
        console.error(`${LOG_PREFIX} Init auth exception:`, error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      console.log(`${LOG_PREFIX} Auth state change:`, event, session?.user?.email || session?.user?.id || 'no user');
      
      switch (event) {
        case 'SIGNED_OUT':
          console.log(`${LOG_PREFIX} User signed out`);
          queryClient.clear();
          setSession(null);
          setUser(null);
          setGuestMode(false);
          break;
          
        case 'SIGNED_IN':
          console.log(`${LOG_PREFIX} User signed in`);
          if (session) {
            setSession(session);
            setUser(session.user);
            setGuestMode(false);
            
            if (!session.user.is_anonymous && pendingMigrationSnapshot.current) {
              await performMigration(session.user.id, pendingMigrationSnapshot.current);
            }
          }
          break;
          
        case 'TOKEN_REFRESHED':
          console.log(`${LOG_PREFIX} Token refreshed`);
          if (session) {
            setSession(session);
            setUser(session.user);
          }
          break;
          
        case 'USER_UPDATED':
          console.log(`${LOG_PREFIX} User updated`);
          if (session) {
            setSession(session);
            setUser(session.user);
          }
          break;
          
        default:
          if (session) {
            setSession(session);
            setUser(session.user);
          }
      }
      
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [queryClient, performMigration]);

  const contextValue: AuthContextType = {
    user: guestMode ? null : user,
    session: guestMode ? null : session,
    loading,
    isAuthenticated: guestMode ? false : isAuthenticated,
    isAnonymous: guestMode ? false : isAnonymous,
    isGuestMode: guestMode,
    signIn,
    signUp,
    signOut,
    continueAsGuest,
    upgradeGuestToUser,
  };

  return (
    <AuthContext.Provider value={contextValue}>
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
