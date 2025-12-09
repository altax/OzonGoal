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
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOG_PREFIX = '[AuthContext]';
const IS_DEV = __DEV__;

function secureLog(message: string, ...args: unknown[]) {
  if (IS_DEV) {
    console.log(message, ...args);
  }
}

function secureWarn(message: string, ...args: unknown[]) {
  if (IS_DEV) {
    console.warn(message, ...args);
  }
}

function secureError(message: string, ...args: unknown[]) {
  if (IS_DEV) {
    console.error(message, ...args);
  }
}

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
      secureLog(`${LOG_PREFIX} Creating user record for:`, userId);
      
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') {
        secureError(`${LOG_PREFIX} Error checking existing user:`, selectError);
      }

      if (!existingUser) {
        const { error: insertError } = await supabase.from('users').insert({
          id: userId,
          username,
          balance: 0,
        });
        
        if (insertError) {
          secureError(`${LOG_PREFIX} Error creating user record:`, insertError);
        } else {
          secureLog(`${LOG_PREFIX} User record created successfully`);
        }
      } else {
        secureLog(`${LOG_PREFIX} User record already exists`);
      }
    } catch (error) {
      secureError(`${LOG_PREFIX} Failed to create user record:`, error);
    }
  }, []);

  const performMigration = useCallback(async (
    userId: string, 
    snapshot?: Awaited<ReturnType<typeof getLocalDataSnapshot>>
  ) => {
    if (migrationInProgress.current) {
      secureLog(`${LOG_PREFIX} Migration already in progress, skipping`);
      return;
    }

    try {
      migrationInProgress.current = true;
      secureLog(`${LOG_PREFIX} Starting migration check for user:`, userId);
      
      const dataToMigrate = snapshot || await getLocalDataSnapshot();
      
      if (!dataToMigrate) {
        secureLog(`${LOG_PREFIX} No local data to migrate`);
        return;
      }

      secureLog(`${LOG_PREFIX} Found local data to migrate:`, {
        goals: dataToMigrate.goals.length,
        shifts: dataToMigrate.shifts.length,
        allocations: dataToMigrate.allocations.length,
        balance: dataToMigrate.user.balance,
      });

      const result = await migrateLocalDataToCloud(userId, dataToMigrate);
      
      if (result.success) {
        secureLog(`${LOG_PREFIX} Migration completed:`, result);
        
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
        secureError(`${LOG_PREFIX} Migration failed:`, result.error);
        Alert.alert(
          'Ошибка миграции',
          'Не удалось перенести локальные данные. Попробуйте снова позже.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      secureError(`${LOG_PREFIX} Migration error:`, error);
    } finally {
      migrationInProgress.current = false;
      pendingMigrationSnapshot.current = null;
    }
  }, [queryClient]);

  const continueAsGuest = useCallback(() => {
    secureLog(`${LOG_PREFIX} User continuing as guest`);
    setGuestMode(true);
    setUser(null);
    setSession(null);
    setLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    secureLog(`${LOG_PREFIX} Attempting sign in for:`, email);
    
    try {
      const snapshot = guestMode ? await getLocalDataSnapshot() : null;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        secureError(`${LOG_PREFIX} Sign in error:`, error.message);
        return { error };
      }

      secureLog(`${LOG_PREFIX} Sign in successful`);
      
      if (data.user && snapshot) {
        pendingMigrationSnapshot.current = snapshot;
        setGuestMode(false);
        await performMigration(data.user.id, snapshot);
      }

      return { error: null };
    } catch (error) {
      secureError(`${LOG_PREFIX} Sign in exception:`, error);
      return { error: error as Error };
    }
  }, [guestMode, performMigration]);

  const signUp = useCallback(async (email: string, password: string) => {
    secureLog(`${LOG_PREFIX} Attempting sign up for:`, email);
    
    try {
      const snapshot = guestMode ? await getLocalDataSnapshot() : null;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        secureError(`${LOG_PREFIX} Sign up error:`, error.message);
        return { error };
      }

      secureLog(`${LOG_PREFIX} Sign up successful`);
      
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
      secureError(`${LOG_PREFIX} Sign up exception:`, error);
      return { error: error as Error };
    }
  }, [guestMode, createUserRecord, performMigration]);

  const upgradeGuestToUser = useCallback(async (email: string, password: string) => {
    secureLog(`${LOG_PREFIX} Upgrading guest to registered user:`, email);
    
    if (!guestMode) {
      secureLog(`${LOG_PREFIX} Not in guest mode, using regular sign up`);
      return signUp(email, password);
    }

    try {
      const snapshot = await getLocalDataSnapshot();
      secureLog(`${LOG_PREFIX} Guest data snapshot:`, snapshot ? 'has data' : 'no data');
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        secureError(`${LOG_PREFIX} Upgrade error:`, error.message);
        return { error };
      }

      if (data.user) {
        secureLog(`${LOG_PREFIX} User created, setting up account`);
        await createUserRecord(data.user.id, email.split('@')[0]);
        
        if (snapshot) {
          secureLog(`${LOG_PREFIX} Migrating guest data to new account`);
          setGuestMode(false);
          await performMigration(data.user.id, snapshot);
        }
      }

      return { error: null };
    } catch (error) {
      secureError(`${LOG_PREFIX} Upgrade exception:`, error);
      return { error: error as Error };
    }
  }, [guestMode, signUp, createUserRecord, performMigration]);

  const signOut = useCallback(async () => {
    secureLog(`${LOG_PREFIX} Signing out`);
    
    try {
      queryClient.clear();
      
      if (guestMode) {
        secureLog(`${LOG_PREFIX} Clearing guest mode state`);
        setGuestMode(false);
        setUser(null);
        setSession(null);
        return;
      }

      const { error } = await supabase.auth.signOut({ scope: 'local' });
      
      if (error) {
        secureError(`${LOG_PREFIX} Sign out error:`, error);
      } else {
        secureLog(`${LOG_PREFIX} Sign out successful`);
      }
    } catch (error) {
      secureError(`${LOG_PREFIX} Sign out exception:`, error);
    }
  }, [guestMode, queryClient]);

  const resetPassword = useCallback(async (email: string) => {
    secureLog(`${LOG_PREFIX} Requesting password reset for email`);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        secureError(`${LOG_PREFIX} Password reset error:`, error.message);
        return { error };
      }

      secureLog(`${LOG_PREFIX} Password reset email sent`);
      return { error: null };
    } catch (error) {
      secureError(`${LOG_PREFIX} Password reset exception:`, error);
      return { error: error as Error };
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      secureLog(`${LOG_PREFIX} Initializing authentication`);
      
      if (!isSupabaseConfigured()) {
        secureWarn(`${LOG_PREFIX} Supabase not configured, falling back to guest mode`);
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
          secureError(`${LOG_PREFIX} Error getting session:`, error);
          // Auto-start in guest mode on error
          setGuestMode(true);
          setLoading(false);
          return;
        }

        if (session) {
          secureLog(`${LOG_PREFIX} Existing session found for:`, session.user.email || session.user.id);
          setSession(session);
          setUser(session.user);
          setGuestMode(false);
          
          if (!session.user.is_anonymous) {
            await performMigration(session.user.id);
          }
        } else {
          // No session - automatically start in guest mode (no login screen)
          secureLog(`${LOG_PREFIX} No existing session, auto-starting guest mode`);
          setSession(null);
          setUser(null);
          setGuestMode(true);
        }
        
        setLoading(false);
      } catch (error) {
        secureError(`${LOG_PREFIX} Init auth exception:`, error);
        if (mounted) {
          // Auto-start in guest mode on exception
          setGuestMode(true);
          setLoading(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;
      
      secureLog(`${LOG_PREFIX} Auth state change:`, event, session?.user?.email || session?.user?.id || 'no user');
      
      switch (event) {
        case 'SIGNED_OUT':
          secureLog(`${LOG_PREFIX} User signed out, returning to guest mode`);
          queryClient.clear();
          setSession(null);
          setUser(null);
          setGuestMode(true);
          break;
          
        case 'SIGNED_IN':
          secureLog(`${LOG_PREFIX} User signed in`);
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
          secureLog(`${LOG_PREFIX} Token refreshed`);
          if (session) {
            setSession(session);
            setUser(session.user);
          }
          break;
          
        case 'USER_UPDATED':
          secureLog(`${LOG_PREFIX} User updated`);
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
    resetPassword,
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
