import React, { createContext, useContext, useMemo } from 'react';

type DataMode = 'local' | 'cloud';

interface DataModeContextType {
  mode: DataMode;
  isAuthenticated: boolean;
  userId: string | null;
}

const DataModeContext = createContext<DataModeContextType | undefined>(undefined);

interface DataModeProviderProps {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userId?: string | null;
}

export function DataModeProvider({ children, isAuthenticated, userId }: DataModeProviderProps) {
  const value = useMemo(() => ({
    mode: isAuthenticated ? 'cloud' as const : 'local' as const,
    isAuthenticated,
    userId: userId || null,
  }), [isAuthenticated, userId]);

  return (
    <DataModeContext.Provider value={value}>
      {children}
    </DataModeContext.Provider>
  );
}

export function useDataMode() {
  const context = useContext(DataModeContext);
  if (context === undefined) {
    throw new Error('useDataMode must be used within a DataModeProvider');
  }
  return context;
}
