import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GoalsScreen from "@/screens/GoalsScreen";
import ShiftsScreen from "@/screens/ShiftsScreen";
import StatisticsScreen from "@/screens/StatisticsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { useTheme } from "@/hooks/useTheme";
import { BalanceHeader } from "@/components/BalanceHeader";
import { SegmentedTabs, TabKey } from "@/components/SegmentedTabs";
import { Spacing, BorderRadius } from "@/constants/theme";

export type MainTabParamList = {
  GoalsTab: undefined;
  ShiftsTab: undefined;
  StatisticsTab: undefined;
  SettingsTab: undefined;
};

export default function MainTabNavigator() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>("goals");

  const renderContent = () => {
    switch (activeTab) {
      case "goals":
        return <GoalsScreen />;
      case "shifts":
        return <ShiftsScreen />;
      case "statistics":
        return <StatisticsScreen />;
      case "settings":
        return <SettingsScreen />;
      default:
        return <GoalsScreen />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <BalanceHeader balance={24580} />
        <SegmentedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </View>
      <View style={[styles.content, { backgroundColor: theme.backgroundContent }]}>
        {renderContent()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing["2xl"],
  },
  content: {
    flex: 1,
    marginTop: Spacing.lg,
    borderTopLeftRadius: BorderRadius["2xl"],
    borderTopRightRadius: BorderRadius["2xl"],
  },
});
