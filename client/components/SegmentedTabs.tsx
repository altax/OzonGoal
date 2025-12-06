import { View, Pressable, StyleSheet } from "react-native";

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
      style={styles.tabItem}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <View style={styles.tabContainer}>
        <ThemedText
          style={[
            styles.tabLabel,
            { color: isActive ? theme.text : theme.textSecondary },
          ]}
        >
          {tab.label}
        </ThemedText>
        <View
          style={[
            styles.underline,
            { backgroundColor: isActive ? theme.text : "transparent" },
          ]}
        />
      </View>
    </Pressable>
  );
}

export function SegmentedTabs({ activeTab, onTabChange }: SegmentedTabsProps) {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      {tabs.map((tab) => (
        <TabItem
          key={tab.key}
          tab={tab}
          isActive={activeTab === tab.key}
          onPress={() => onTabChange(tab.key)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
  },
  tabContainer: {
    paddingVertical: Spacing.md,
    alignItems: "center",
  },
  underline: {
    height: 2,
    width: "100%",
    marginTop: Spacing.sm,
    borderRadius: 1,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
});
