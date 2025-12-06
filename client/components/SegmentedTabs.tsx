import { View, Pressable, StyleSheet, LayoutChangeEvent } from "react-native";
import { useState } from "react";
import Animated, {
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

export type TabKey = "goals" | "shifts" | "statistics" | "settings";

interface Tab {
  key: TabKey;
  label: string;
}

const tabs: Tab[] = [
  { key: "goals", label: "Цели" },
  { key: "shifts", label: "Смены" },
  { key: "statistics", label: "Обзор" },
  { key: "settings", label: "Профиль" },
];

interface SegmentedTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

interface TabLayout {
  x: number;
  width: number;
}

export function SegmentedTabs({ activeTab, onTabChange }: SegmentedTabsProps) {
  const { theme } = useTheme();
  const [tabLayouts, setTabLayouts] = useState<Record<TabKey, TabLayout>>({} as Record<TabKey, TabLayout>);

  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const activeLayout = tabLayouts[activeTab];

  const timingConfig = { duration: 250, easing: Easing.out(Easing.cubic) };

  const indicatorStyle = useAnimatedStyle(() => {
    if (!activeLayout) {
      return { opacity: 0 };
    }
    return {
      opacity: 1,
      transform: [{ translateX: withTiming(activeLayout.x, timingConfig) }],
      width: withTiming(activeLayout.width, timingConfig),
    };
  }, [activeLayout]);

  const handleTabLayout = (key: TabKey, event: LayoutChangeEvent) => {
    const { x, width } = event.nativeEvent.layout;
    setTabLayouts((prev) => ({
      ...prev,
      [key]: { x, width },
    }));
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => onTabChange(tab.key)}
              onLayout={(e) => handleTabLayout(tab.key, e)}
            >
              <ThemedText
                style={[
                  styles.tabLabel,
                  { color: isActive ? theme.accent : theme.textSecondary },
                  isActive && styles.tabLabelActive,
                ]}
              >
                {tab.label}
              </ThemedText>
            </Pressable>
          );
        })}
        <Animated.View
          style={[
            styles.indicator,
            { backgroundColor: theme.accent },
            indicatorStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: Spacing.md,
  },
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  tabLabelActive: {
    fontWeight: "600",
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 2,
    borderRadius: 1,
  },
});
