import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import Animated, {
  useAnimatedStyle,
  withSpring,
  interpolate,
} from "react-native-reanimated";

import GoalsScreen from "@/screens/GoalsScreen";
import ShiftsScreen from "@/screens/ShiftsScreen";
import StatisticsScreen from "@/screens/StatisticsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

export type MainTabParamList = {
  GoalsTab: undefined;
  ShiftsTab: undefined;
  StatisticsTab: undefined;
  SettingsTab: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

interface TabIconProps {
  name: keyof typeof Feather.glyphMap;
  focused: boolean;
  color: string;
  size: number;
}

function TabIcon({ name, focused, color, size }: TabIconProps) {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: withSpring(focused ? 1.1 : 1, {
            damping: 15,
            stiffness: 150,
          }),
        },
      ],
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <Feather name={name} size={size} color={color} />
    </Animated.View>
  );
}

export default function MainTabNavigator() {
  const { theme, isDark } = useTheme();
  const screenOptions = useScreenOptions();

  return (
    <Tab.Navigator
      initialRouteName="GoalsTab"
      screenOptions={{
        ...screenOptions,
        tabBarActiveTintColor: theme.accent,
        tabBarInactiveTintColor: theme.tabIconDefault,
        tabBarLabelStyle: {
          fontSize: Typography.tabLabel.fontSize,
          fontWeight: Typography.tabLabel.fontWeight,
          marginTop: Spacing.xs,
        },
        tabBarStyle: {
          position: "absolute",
          height: 65,
          paddingTop: Spacing.sm,
          paddingBottom: Platform.OS === "ios" ? Spacing.xl : Spacing.sm,
          backgroundColor: Platform.select({
            ios: "transparent",
            android: theme.backgroundDefault,
            web: theme.backgroundDefault,
          }),
          borderTopWidth: 0,
          elevation: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        tabBarBackground: () =>
          Platform.OS === "ios" ? (
            <BlurView
              intensity={100}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : null,
      }}
    >
      <Tab.Screen
        name="GoalsTab"
        component={GoalsScreen}
        options={{
          title: "Цели",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="target" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ShiftsTab"
        component={ShiftsScreen}
        options={{
          title: "Смены",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="clock" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="StatisticsTab"
        component={StatisticsScreen}
        options={{
          title: "Статистика",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="bar-chart-2" focused={focused} color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          headerTransparent: false,
          headerTitle: "Настройки",
          title: "Настройки",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon name="settings" focused={focused} color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
