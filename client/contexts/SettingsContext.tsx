import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type BalancePosition = "left" | "center" | "right";

interface SettingsContextType {
  balancePosition: BalancePosition;
  setBalancePosition: (position: BalancePosition) => void;
  isBalanceHidden: boolean;
  setIsBalanceHidden: (hidden: boolean) => void;
  toggleBalanceVisibility: () => void;
  isPinLockEnabled: boolean;
  pinCode: string | null;
  isAppLocked: boolean;
  setPinLock: (pin: string | null) => Promise<void>;
  unlockApp: (pin: string) => boolean;
  lockApp: () => void;
  userName: string;
  setUserName: (name: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const BALANCE_POSITION_KEY = "balance_position";
const BALANCE_HIDDEN_KEY = "balance_hidden";
const PIN_CODE_KEY = "@app_pin_code";
const PIN_ENABLED_KEY = "@app_pin_enabled";
const USER_NAME_KEY = "user_name";

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

function getStoredUserName(): string {
  if (Platform.OS === "web") {
    try {
      return localStorage.getItem(USER_NAME_KEY) || "";
    } catch {}
  }
  return "";
}

function storeUserName(name: string) {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(USER_NAME_KEY, name);
    } catch {}
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [balancePosition, setBalancePositionState] = useState<BalancePosition>(getStoredBalancePosition);
  const [isBalanceHidden, setIsBalanceHiddenState] = useState<boolean>(getStoredBalanceHidden);
  const [pinCode, setPinCodeState] = useState<string | null>(null);
  const [isPinLockEnabled, setIsPinLockEnabled] = useState(false);
  const [isAppLocked, setIsAppLocked] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [userName, setUserNameState] = useState<string>(getStoredUserName);

  useEffect(() => {
    const loadPinSettings = async () => {
      try {
        const [storedPin, storedEnabled] = await Promise.all([
          AsyncStorage.getItem(PIN_CODE_KEY),
          AsyncStorage.getItem(PIN_ENABLED_KEY),
        ]);
        
        if (storedPin && storedEnabled === "true") {
          setPinCodeState(storedPin);
          setIsPinLockEnabled(true);
          setIsAppLocked(true);
        }
      } catch (error) {
        console.log("[Settings] Error loading PIN settings:", error);
      } finally {
        setInitialized(true);
      }
    };
    
    loadPinSettings();
  }, []);

  useEffect(() => {
    storeBalancePosition(balancePosition);
  }, [balancePosition]);

  useEffect(() => {
    storeBalanceHidden(isBalanceHidden);
  }, [isBalanceHidden]);

  useEffect(() => {
    storeUserName(userName);
  }, [userName]);

  const setBalancePosition = (position: BalancePosition) => {
    setBalancePositionState(position);
  };

  const setIsBalanceHidden = (hidden: boolean) => {
    setIsBalanceHiddenState(hidden);
  };

  const toggleBalanceVisibility = () => {
    setIsBalanceHiddenState(prev => !prev);
  };

  const setPinLock = async (pin: string | null) => {
    try {
      if (pin) {
        await Promise.all([
          AsyncStorage.setItem(PIN_CODE_KEY, pin),
          AsyncStorage.setItem(PIN_ENABLED_KEY, "true"),
        ]);
        setPinCodeState(pin);
        setIsPinLockEnabled(true);
      } else {
        await Promise.all([
          AsyncStorage.removeItem(PIN_CODE_KEY),
          AsyncStorage.removeItem(PIN_ENABLED_KEY),
        ]);
        setPinCodeState(null);
        setIsPinLockEnabled(false);
        setIsAppLocked(false);
      }
    } catch (error) {
      console.log("[Settings] Error saving PIN settings:", error);
    }
  };

  const unlockApp = (enteredPin: string): boolean => {
    if (enteredPin === pinCode) {
      setIsAppLocked(false);
      return true;
    }
    return false;
  };

  const lockApp = () => {
    if (isPinLockEnabled && pinCode) {
      setIsAppLocked(true);
    }
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
  };

  return (
    <SettingsContext.Provider
      value={{
        balancePosition,
        setBalancePosition,
        isBalanceHidden,
        setIsBalanceHidden,
        toggleBalanceVisibility,
        isPinLockEnabled,
        pinCode,
        isAppLocked,
        setPinLock,
        unlockApp,
        lockApp,
        userName,
        setUserName,
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
