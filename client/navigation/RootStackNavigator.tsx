import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View, StyleSheet } from "react-native";

import MainTabNavigator from "@/navigation/MainTabNavigator";
import AuthScreen from "@/screens/AuthScreen";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";
import { DataModeProvider } from "@/contexts/DataModeContext";

export type RootStackParamList = {
  Main: undefined;
  Auth: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const screenOptions = useScreenOptions();
  const { loading, user, isAuthenticated, isGuestMode } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.accent} />
      </View>
    );
  }

  const showMainApp = user !== null || isGuestMode;

  return (
    <DataModeProvider isAuthenticated={isAuthenticated} userId={user?.id}>
      <Stack.Navigator screenOptions={screenOptions}>
        {showMainApp ? (
          <Stack.Screen
            name="Main"
            component={MainTabNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </DataModeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
