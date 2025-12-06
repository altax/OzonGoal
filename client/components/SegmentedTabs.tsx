import { View, Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, BorderRadius } from "@/constants/theme";

export type TabKey = "goals" | "shifts" | "statistics" | "settings";

interface Tab {
  key: TabKey;
  label: string;
}

const tabs: Tab[] = [
  { key: "goals", label: "Цели" },
  { key: "shifts", label: "Смены" },
  { key: "statistics", label: "Статистика" },
  { key: "settings", label: "Профиль" },
];

interface SegmentedTabsProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

function TabItem({
  tab,
  isActive,
  onPress,
}: {
  tab: Tab;
  isActive: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();

  return (
    <Pressable
      style={[
        styles.tabItem,
        {
          backgroundColor: isActive ? theme.tabActiveBackground : "transparent",
        },
      ]}
      onPress={onPress}
      hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
    >
      <ThemedText
        style={[
          styles.tabLabel,
          { color: isActive ? theme.tabActiveText : theme.tabInactiveText },
        ]}
      >
        {tab.label}
      </ThemedText>
    </Pressable>
  );
}

export function SegmentedTabs({ activeTab, onTabChange }: SegmentedTabsProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.wrapper}>
      <View style={[styles.container, { backgroundColor: theme.tabBackground }]}>
        {tabs.map((tab) => (
          <TabItem
            key={tab.key}
            tab={tab}
            isActive={activeTab === tab.key}
            onPress={() => onTabChange(tab.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  container: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.sm,
    padding: 4,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.xs,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
});
