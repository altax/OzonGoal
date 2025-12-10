import React from "react";
import { StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ThemeProvider, useThemeContext } from "@/contexts/ThemeContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { MilestoneProvider } from "@/contexts/MilestoneContext";
import { useSupabaseRealtime } from "@/hooks/useSupabaseRealtime";
import { PinLockScreen } from "@/components/PinLockScreen";

function AppContent() {
  const { isDark } = useThemeContext();
  const { isAppLocked } = useSettings();
  
  useSupabaseRealtime();
  
  if (isAppLocked) {
    return (
      <SafeAreaProvider>
        <GestureHandlerRootView style={styles.root}>
          <PinLockScreen />
          <StatusBar style={isDark ? "light" : "dark"} />
        </GestureHandlerRootView>
      </SafeAreaProvider>
    );
  }
  
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <KeyboardProvider>
          <NavigationContainer>
            <RootStackNavigator />
          </NavigationContainer>
          <StatusBar style={isDark ? "light" : "dark"} />
        </KeyboardProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <SettingsProvider>
              <MilestoneProvider>
                <AppContent />
              </MilestoneProvider>
            </SettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
