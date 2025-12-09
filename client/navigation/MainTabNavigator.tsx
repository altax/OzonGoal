import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import GoalsScreen from "@/screens/GoalsScreen";
import ShiftsScreen from "@/screens/ShiftsScreen";
import StatisticsScreen from "@/screens/StatisticsScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import { useTheme } from "@/hooks/useTheme";
import { BalanceHeader, TabInfo } from "@/components/BalanceHeader";
import { BalanceHistoryModal } from "@/components/BalanceHistoryModal";
import { SegmentedTabs, TabKey } from "@/components/SegmentedTabs";
import { GuestOnboardingModal } from "@/components/GuestOnboardingModal";
import { useGoalsSummary, useShiftsSummary, useUser } from "@/api";
import { useAuth } from "@/contexts/AuthContext";
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
  const [showBalanceHistory, setShowBalanceHistory] = useState(false);
  const { isGuestMode } = useAuth();

  const { data: goalsSummary } = useGoalsSummary();
  const { data: shiftsSummary } = useShiftsSummary();
  const { data: user } = useUser();

  const handleOpenAuth = useCallback(() => {
    setActiveTab("settings");
  }, []);

  const tabInfo: TabInfo | undefined = useMemo(() => {
    switch (activeTab) {
      case "goals":
        if (goalsSummary && goalsSummary.count > 0) {
          return {
            type: "goals",
            count: goalsSummary.count,
            totalTarget: goalsSummary.totalTarget,
            totalCurrent: goalsSummary.totalCurrent,
            averageEarningsPerShift: 3200,
          };
        }
        return undefined;
      case "shifts":
        if (shiftsSummary) {
          return {
            type: "shifts",
            past: shiftsSummary.past,
            scheduled: shiftsSummary.scheduled,
            hasCurrent: !!shiftsSummary.current,
            currentShift: shiftsSummary.current ? {
              scheduledEnd: shiftsSummary.current.scheduledEnd,
              shiftType: shiftsSummary.current.shiftType,
            } : null,
          };
        }
        return undefined;
      default:
        return undefined;
    }
  }, [activeTab, goalsSummary, shiftsSummary]);

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
        <BalanceHeader 
          balance={typeof user?.balance === 'string' ? parseFloat(user.balance) || 0 : user?.balance || 0} 
          tabInfo={tabInfo} 
          onBalancePress={() => setShowBalanceHistory(true)}
        />
        <SegmentedTabs activeTab={activeTab} onTabChange={setActiveTab} />
      </View>
      <View style={[styles.content, { backgroundColor: theme.backgroundContent }]}>
        {renderContent()}
      </View>
      <BalanceHistoryModal
        visible={showBalanceHistory}
        onClose={() => setShowBalanceHistory(false)}
      />
      <GuestOnboardingModal
        isGuestMode={isGuestMode}
        onOpenAuth={handleOpenAuth}
      />
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
