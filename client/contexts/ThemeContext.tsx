import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import { Colors } from "@/constants/theme";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: typeof Colors.light;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "theme_mode";

function getStoredTheme(): ThemeMode | null {
  if (Platform.OS === "web") {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "light" || stored === "dark") {
        return stored;
      }
    } catch {}
  }
  return null;
}

function storeTheme(mode: ThemeMode) {
  if (Platform.OS === "web") {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {}
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    return getStoredTheme() || "light";
  });

  useEffect(() => {
    storeTheme(themeMode);
  }, [themeMode]);

  const toggleTheme = () => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  };

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  const theme = themeMode === "dark" ? Colors.dark : Colors.light;
  const isDark = themeMode === "dark";

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useThemeContext must be used within a ThemeProvider");
  }
  return context;
}
