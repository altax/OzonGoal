import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";

export type BalancePosition = "left" | "center" | "right";

interface SettingsContextType {
  balancePosition: BalancePosition;
  setBalancePosition: (position: BalancePosition) => void;
  isBalanceHidden: boolean;
  setIsBalanceHidden: (hidden: boolean) => void;
  toggleBalanceVisibility: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const BALANCE_POSITION_KEY = "balance_position";
const BALANCE_HIDDEN_KEY = "balance_hidden";

function getStoredBalancePosition(): BalancePosition {
  if (Platform.OS === "web") {
    try {
      const stored = localStorage.getItem(BALANCE_POSITION_KEY);
      if (stored === "left" || stored === "center" || stored === "right") {
        return stored;
      }
    } catch {}
  }
  return "right";
}

function storeBalancePosition(position: BalancePosition) {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(BALANCE_POSITION_KEY, position);
    } catch {}
  }
}

function getStoredBalanceHidden(): boolean {
  if (Platform.OS === "web") {
    try {
      const stored = localStorage.getItem(BALANCE_HIDDEN_KEY);
      return stored === "true";
    } catch {}
  }
  return false;
}

function storeBalanceHidden(hidden: boolean) {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(BALANCE_HIDDEN_KEY, hidden ? "true" : "false");
    } catch {}
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [balancePosition, setBalancePositionState] = useState<BalancePosition>(getStoredBalancePosition);
  const [isBalanceHidden, setIsBalanceHiddenState] = useState<boolean>(getStoredBalanceHidden);

  useEffect(() => {
    storeBalancePosition(balancePosition);
  }, [balancePosition]);

  useEffect(() => {
    storeBalanceHidden(isBalanceHidden);
  }, [isBalanceHidden]);

  const setBalancePosition = (position: BalancePosition) => {
    setBalancePositionState(position);
  };

  const setIsBalanceHidden = (hidden: boolean) => {
    setIsBalanceHiddenState(hidden);
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceHiddenState(prev => !prev);
  };

  return (
    <SettingsContext.Provider
      value={{
        balancePosition,
        setBalancePosition,
        isBalanceHidden,
        setIsBalanceHidden,
        toggleBalanceVisibility,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
